export class PosixTools {
  static async pgrepCommand(cmd: string): Promise<number | null> {
    const command = new Deno.Command("pgrep", {
      args: ["-f", cmd],
    });

    const { code, stdout } = await command.output();

    if (code !== 0) {
      return null;
    }

    const out = new TextDecoder().decode(stdout);

    return parseInt(out.trim());
  }

  static async pgrepChildren(pid: number): Promise<number[]> {
    const command = new Deno.Command("pgrep", {
      args: ["-P", String(pid)],
    });

    const { code, stdout } = await command.output();

    if (code !== 0) {
      return [];
    }

    const out = new TextDecoder().decode(stdout);

    return out.trim().split("\n").map((line) => parseInt(line));
  }

  static async pgrepWholeTree(pid: number): Promise<number[]> {
    const pids = [pid];
    for (const child of await this.pgrepChildren(pid)) {
      pids.push(...await this.pgrepWholeTree(child));
    }
    return pids;
  }

  static async psInfo(pid: number) {
    const command = new Deno.Command("ps", {
      args: ["-o", "pid=,command=", "-p", String(pid)],
    });

    const { code, stdout } = await command.output();

    if (code !== 0) {
      return null;
    }

    {
      const out = new TextDecoder().decode(stdout);
      const match = out.trim().match(/^([0-9]+) (.*)$/);
      if (match === null) {
        throw new Error(`bad format: "${out}"`);
      }
      return {
        pid: parseInt(match[1]),
        command: match[2],
      };
    }
  }

  static async kill(pid: number, mode: "TERM" | "9"): Promise<void> {
    const command = new Deno.Command("kill", {
      args: [`-${mode}`, String(pid)],
    });

    const { code } = await command.output();

    if (code !== 0) {
      throw new Error("fail: kill");
    }
  }
}
