import * as index from './index';

describe('index', () => {
  describe('parseFile', () => {
    const subject = index.parseFile;
    const fixturePath = `${__dirname}/__fixtures__/workout.csv`;

    it('should throw an error if the filename is invalid', async () => {
      await expect(subject('some-fake-file.csv').next()).rejects.toThrow();
    });

    it('should parse a Stages cycling CSV file', async() => {
      await expect(subject(fixturePath).next()).resolves.toStrictEqual({
        done: false,
        value: {
          currentTime: 13,
          km: 0,
          kmPerHour: 0,
          watts: 0,
          heartRate: 0,
          rpm: 59,
          misc: {
            currentStage: 1
          }
        }
      });
    })

    it('should correctly parse the line and increment the currentStage value throughout parsing', async () => {
      let line;

      // Iterate through the file and get the last line:
      // 42:08,21.39,11.24,15,0,39,
      for await (line of subject(fixturePath)) {
        //
      }
      expect(line).toStrictEqual({
        currentTime: 2528,
        km: 21.39,
        kmPerHour: 11.24,
        watts: 15,
        heartRate: 0,
        rpm: 39,
        misc: {
          currentStage: 5
        }
      })
    });
  });
});
