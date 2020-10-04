declare enum Columns {
    CURRENT_TIME = "currentTime",
    KM = "km",
    KM_PER_HOUR = "kmPerHour",
    WATTS = "watts",
    HEART_RATE = "heartRate",
    RPM = "rpm",
    COM = "com",
    MISC = "misc"
}
declare type LineBase = {
    [Columns.CURRENT_TIME]: number;
    [Columns.KM]: number;
    [Columns.KM_PER_HOUR]: number;
    [Columns.WATTS]: number;
    [Columns.HEART_RATE]: number;
    [Columns.RPM]: number;
};
declare type ParseResult = LineBase & {
    [Columns.MISC]: {
        currentStage: number;
    };
};
export declare function parseFile(filename: string): AsyncGenerator<ParseResult>;
export {};
