import * as fs from "fs";
import * as exec from "@actions/exec";
import { ScanIdListener } from "./wiz-cli";

test("ScanIdListener", async () => {
  const listener = new ScanIdListener();
  const nullStream = fs.createWriteStream("/dev/null");

  await exec.exec("cat", ["test/wizcli/scan.log"], {
    listeners: {
      stdout: listener.listen,
    },
    outStream: nullStream,
  });

  expect(listener.scanId).toBe("aa24bcf7-b54a-4514-92d6-2d6651c7abb8");
});
