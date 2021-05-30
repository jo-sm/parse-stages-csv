import { default as parseCsv } from "csv-parse";
import { readFile } from "fs";
import { promisify } from "util";

enum Columns {
  CURRENT_TIME = "currentTime",
  KM = "km",
  KM_PER_HOUR = "kmPerHour",
  WATTS = "watts",
  HEART_RATE = "heartRate",
  RPM = "rpm",
  COM = "com",
  MISC = "misc",
}

type LineBase = {
  [Columns.CURRENT_TIME]: number;
  [Columns.KM]: number;
  [Columns.KM_PER_HOUR]: number;
  [Columns.WATTS]: number;
  [Columns.HEART_RATE]: number;
  [Columns.RPM]: number;
};

type LineCSV = LineBase & {
  // TODO: strictly type this
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [Columns.COM]: any;
};

type Options = {
  normalize?: boolean;
  stages?: number | [number] | [number, number];
};

type StrictOptions = {
  normalize: boolean;
  stages: [number, number];
};

export type ParseResult = LineBase & {
  [Columns.MISC]: {
    currentStage: number;
  };
};

export async function* parseFile(
  filename: string,
  options: Options = {}
): AsyncGenerator<ParseResult> {
  const { stages: rawStagesOption = [1, Infinity], ...otherOptions } = options;

  let stages: [number, number];

  if (
    Array.isArray(rawStagesOption) &&
    ![1, 2].includes(rawStagesOption.length)
  ) {
    throw new Error(
      `Expected an array of 1 or 2 numbers, got an array of length ${rawStagesOption.length}`
    );
  }

  if (typeof rawStagesOption === "number") {
    stages = [rawStagesOption, rawStagesOption];
  } else if (rawStagesOption.length === 1) {
    stages = [rawStagesOption[0], rawStagesOption[0]];
  } else {
    stages = rawStagesOption;
  }

  const parsedOptions: StrictOptions = Object.assign(
    {
      normalize: false,
      stages: [1, Infinity],
    },
    {
      ...otherOptions,
      stages,
    }
  );

  let io: Buffer;

  try {
    io = await promisify(readFile)(filename);
  } catch {
    throw new Error(`Could not read file ${filename}`);
  }

  // The bike always starts recording in the first stage
  let currentStage = 1;

  const parser = parseCsv<LineCSV>(io, {
    columns: [
      Columns.CURRENT_TIME,
      Columns.KM,
      Columns.KM_PER_HOUR,
      Columns.WATTS,
      Columns.HEART_RATE,
      Columns.RPM,
      Columns.COM,
    ],
    relax_column_count: true,
    cast: (value, { column: columnName }) => {
      switch (columnName) {
        case Columns.KM:
        case Columns.KM_PER_HOUR: {
          return Number.parseFloat(value);
        }

        case Columns.RPM:
        case Columns.WATTS:
        case Columns.HEART_RATE: {
          return Number.parseInt(value, 10);
        }

        case Columns.CURRENT_TIME: {
          // CURRENT_TIME is always the first column, but the CSV is formatted in a strange way such that the
          // data in the first (and sometimes second) column(s) might not actually be a time.
          let hours = 0;
          let mins = 0;
          let secs = 0;

          const pieces = value.split(":").map((p) => Number.parseInt(p, 10));

          if (pieces.length === 1) {
            // Time from the Stages bike will always have at least one colon, so this is an invalid time.
            if (value.match(/Stage_[0-9][0-9]/)) {
              currentStage++;
            }

            // Because we can trust the time column, if we see it as NaN in the for loop below, we can safely ignore it.
            return NaN;
          }

          // The way that time is represented in the Stages CSV guarantees us to always have at least
          // a minute and second value.
          if (pieces.length === 3) {
            [hours, mins, secs] = pieces;
          } else {
            [mins, secs] = pieces;
          }

          return secs + mins * 60 + hours * 60 * 60;
        }

        case Columns.COM: {
          // COM data seems to be related to the communication between the different systems in the bike. If it's not working
          // correctly, it seems to put an `x` in this column.
          //
          // Since this column isn't particularly relevant for workout analysis, it can be treated as a "misc" column:
          //
          // If the value is `x`, return null.
          // Otherwise, return an object with the current stage.
          if (value === "x") {
            return null;
          } else {
            return {
              currentStage,
            };
          }
        }
      }
    },
  });

  let firstNormalizedLine;

  for await (const line of parser) {
    if (!line[Columns.COM] || Number.isNaN(line[Columns.CURRENT_TIME])) {
      // Ignore any null COM values or any NaN currentTime values, see above.
      continue;
    }

    const misc: ParseResult[Columns.MISC] = line[Columns.COM];

    const { currentStage } = misc;

    if (
      currentStage < parsedOptions.stages[0] ||
      currentStage > parsedOptions.stages[1]
    ) {
      continue;
    }

    delete line[Columns.COM];

    if (currentStage === parsedOptions.stages[0] && !firstNormalizedLine) {
      firstNormalizedLine = line;
    }

    const normalizedTime = parsedOptions.normalize
      ? line.currentTime - (firstNormalizedLine as LineCSV).currentTime
      : line.currentTime;
    const normalizedKm = parsedOptions.normalize
      ? line.km - (firstNormalizedLine as LineCSV).km
      : line.km;

    yield {
      ...line,
      currentTime: normalizedTime,
      km: normalizedKm,
      misc,
    };
  }
}
