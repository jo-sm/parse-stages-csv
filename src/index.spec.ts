import * as index from "./index";
import type { ParseResult } from "./index";

describe("index", () => {
  describe("parseFile", () => {
    const fixturePath = `${__dirname}/__fixtures__/workout.csv`;

    it("should throw an error if the filename is invalid", async () => {
      await expect(
        index.parseFile("some-fake-file.csv").next()
      ).rejects.toThrow();
    });

    it("should parse a Stages cycling CSV file, skipping the initial invalid lines", async () => {
      await expect(index.parseFile(fixturePath).next()).resolves.toStrictEqual({
        done: false,
        value: {
          currentTime: 13,
          km: 0,
          kmPerHour: 0,
          watts: 0,
          heartRate: 0,
          rpm: 59,
          misc: {
            currentStage: 1,
          },
        },
      });
    });

    it("should correctly parse the line and increment the currentStage value throughout parsing", async () => {
      let line: ParseResult;

      // Iterate through the file and get the last line:
      // 42:08,21.39,11.24,15,0,39,
      for await (line of index.parseFile(fixturePath)) {
        //
      }
      expect(line!).toStrictEqual({
        currentTime: 2528,
        km: 21.39,
        kmPerHour: 11.24,
        watts: 15,
        heartRate: 0,
        rpm: 39,
        misc: {
          currentStage: 5,
        },
      });
    });

    describe("options", () => {
      describe("options.stages", () => {
        it("should parse a number or an array of a single number as a single stage", async () => {
          let stage: number = -1;

          for await (const line of index.parseFile(fixturePath, {
            stages: 2,
          })) {
            if (stage === -1) {
              stage = line.misc.currentStage;
            }

            if (line.misc.currentStage !== stage) {
              throw new Error(
                "Expected a single stage to be parsed, got more than one"
              );
            }
          }

          stage = -1;

          for await (const line of index.parseFile(fixturePath, {
            stages: [2],
          })) {
            if (stage === -1) {
              stage = line.misc.currentStage;
            }

            if (line.misc.currentStage !== stage) {
              throw new Error(
                "Expected a single stage to be parsed, got more than one"
              );
            }
          }
        });

        it("should parse an array of two numbers as stages of those numbers, inclusive", async () => {
          const expectedStages = [2, 3, 4, 5];
          const parsedStages: number[] = [];

          for await (const line of index.parseFile(fixturePath, {
            stages: [2, 5],
          })) {
            if (!expectedStages.includes(line.misc.currentStage)) {
              throw new Error(
                `Expected to have stages 2 to 5, got stage ${line.misc.currentStage}`
              );
            }

            if (!parsedStages.includes(line.misc.currentStage)) {
              parsedStages.push(line.misc.currentStage);
            }
          }

          expect(parsedStages).toStrictEqual(expectedStages);
        });

        it("should throw if given an array of more than 2 elements or 0 elements", () => {
          expect(() =>
            // @ts-ignore-next-line
            index.parseFile(fixturePath, { stages: [] }).next()
          ).rejects.toThrow();

          expect(() =>
            // @ts-ignore-next-line
            index.parseFile(fixturePath, { stages: [2, 3, 4] }).next()
          ).rejects.toThrow();
        });
      });

      describe("options.normalize", () => {
        it("should normalize the time and distance traveled to the first parsed line", async () => {
          await expect(
            index.parseFile(fixturePath, { normalize: true, stages: 3 }).next()
          ).resolves.toStrictEqual({
            done: false,
            value: {
              currentTime: 0,
              km: 0,
              kmPerHour: 25.41,
              watts: 84,
              heartRate: 0,
              rpm: 74,
              misc: {
                currentStage: 3,
              },
            },
          });
        });
      });
    });
  });
});
