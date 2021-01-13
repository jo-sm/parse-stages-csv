# `parse-stages-csv`

`parse-stages-csv` is a parser for [Stages indoor bicycle](https://www.stagesindoorcycling.com) CSV data. It allows for parsing the raw CSV data, turning it into a more usable object, with additional metadata like the current stage that the line was recorded during.

# Installation

```bash
npm install @jo-sm/parse-stages-csv
```

The package is available via both [NPM](https://www.npmjs.com/package/@jo-sm/parse-stages-csv) and the [Github](https://github.com/jo-sm/parse-stages-csv/packages) package repositories.

# Usage

```javascript
import { parseFile as parseStagesCSV } from "@jo-sm/parse-stages-csv";

const filename = "my-workout-data.csv";

for await (const datum of parseStagesCSV(filename)) {
  doSomethingWith(datum);
}
```

`parseStagesCSV` is an async generator function and so can be used like above in an async `for...of` loop. Each `datum` is a line, in order, from the CSV, parsed depending on the format (e.g. `currentTime` is an integer of the seconds since the start of the workout).

Note that data that the parser considers "unreliable", i.e. data with a bad `COM` value, as well as lines where the current time does not parse correctly, are ignored.

## Options

You can optionally pass in two options, `stages` and `normalize`.

The `stages` option allows you to select which stages you want in your output. Passing in a number or an array of a single number treats it as if you want just that stage, while passing in an array of numbers selects those stages.

```javascript
for await (const datum of parseStagesCSV(filename, { stages: [3, 5] })) {
  // Do something with data for stages 3, 4, and 5
}
```

The `normalize` option normalizes the resulting time and distance to the first parsed stage, e.g. instead of getting a time of `602` for the first datum when passing in a stage, you will get a time of `0`.

## Data shape

Each datum has the following shape:

```javascript
{
  currentTime, // in seconds
  km, // total distance traveled so far
  kmPerHour, // current KPM
  watts, // current power
  heartRate, // current heart rate or 0
  rpm, // current RPM
  misc: {
    currentStage
  }
}
```

# Issues with parsing

The parser expects the data to laid out like the [fixture CSV](./src/__fixtures__/workout.csv), as this is the only data I have access to so far. If you have a different format, or have issues parsing this format (for example, it does not parse the stage correctly), please [create an issue](https://github.com/jo-sm/parse-stages-csv/issues/new) with the CSV file!

# License

MIT
