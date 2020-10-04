"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFile = void 0;
const csv_parse_1 = __importDefault(require("csv-parse"));
const fs_1 = require("fs");
const util_1 = require("util");
var Columns;
(function (Columns) {
    Columns["CURRENT_TIME"] = "currentTime";
    Columns["KM"] = "km";
    Columns["KM_PER_HOUR"] = "kmPerHour";
    Columns["WATTS"] = "watts";
    Columns["HEART_RATE"] = "heartRate";
    Columns["RPM"] = "rpm";
    Columns["COM"] = "com";
    Columns["MISC"] = "misc";
})(Columns || (Columns = {}));
async function* parseFile(filename) {
    let io;
    try {
        io = await util_1.promisify(fs_1.readFile)(filename);
    }
    catch {
        throw new Error(`Could not read file ${filename}`);
    }
    // The bike always starts recording in the first stage
    let currentStage = 1;
    const parser = csv_parse_1.default(io, {
        columns: [
            Columns.CURRENT_TIME,
            Columns.KM,
            Columns.KM_PER_HOUR,
            Columns.WATTS,
            Columns.HEART_RATE,
            Columns.RPM,
            Columns.COM
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
                    const pieces = value.split(':').map(p => Number.parseInt(p, 10));
                    if (pieces.length === 1) {
                        // Time from the Stages bike will always have at least one colon, so this is an invalid time.
                        if (value.match(/Stage\_[0-9][0-9]/)) {
                            currentStage++;
                        }
                        // Because we can trust the time column, if we see it as NaN in the for loop below, we can safely ignore it.
                        return NaN;
                    }
                    // The way that time is represented in the Stages CSV guarantees us to always have at least
                    // a minute and second value.
                    if (pieces.length === 3) {
                        [hours, mins, secs] = pieces;
                    }
                    else {
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
                    if (value === 'x') {
                        return null;
                    }
                    else {
                        return {
                            currentStage
                        };
                    }
                }
            }
        }
    });
    for await (const line of parser) {
        if (!line[Columns.COM] || Number.isNaN(line[Columns.CURRENT_TIME])) {
            // Ignore any null COM values or any NaN currentTime values, see above.
            continue;
        }
        const misc = line[Columns.COM];
        delete line[Columns.COM];
        yield { ...line, misc };
    }
}
exports.parseFile = parseFile;
