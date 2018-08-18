import cp from "child_process";
import { Observable, Observer, Subscribable, Unsubscribable } from "rxjs";
import { withSpawnWrap } from "../local";
import { ClientMessage, InfoMessage } from "./protocol";
import { RemoteSpawnClient, SpawnServer } from "./server";

const OBSERVABLE_WRAPPER = require.resolve("./observable-wrapper.js");

class SpawnEvent {
  public readonly args: ReadonlyArray<string>;
  private readonly client: RemoteSpawnClient;
  private spawnCount: number;

  constructor(client: RemoteSpawnClient, info: InfoMessage) {
    this.args = Object.freeze([...info.args]);
    this.client = client;
    this.spawnCount = 0;
  }

  public proxySpawn(args?: ReadonlyArray<string>): ChildProcessProxy {
    if (this.spawnCount > 0) {
      throw new Error("Cannot spawn remote process multiple times");
    }
    if (args === undefined) {
      args = this.args;
    }

    const spawnId: number = this.spawnCount;
    this.client.next({
      action: "proxy-spawn",
      spawnId,
      args,
    });
    this.spawnCount++;
    return new ChildProcessProxy(this.client, spawnId);
  }

  public voidSpawn(args?: ReadonlyArray<string>): void {
    if (this.spawnCount > 0) {
      throw new Error("Cannot spawn remote process multiple times");
    }
    if (args === undefined) {
      args = this.args;
    }

    this.client.next({
      action: "void-spawn",
      args,
    });
    this.spawnCount++;
  }
}

export class ChildProcessProxy {
  private readonly file: string;
  private readonly client: RemoteSpawnClient;
  private readonly spawnId: number;

  constructor(client: RemoteSpawnClient, spawnId: number) {
    this.file = "TODO";
    this.client = client;
    this.spawnId = spawnId;
  }
}

export function spawn(
  file: string,
  args?: ReadonlyArray<string>,
  options?: cp.SpawnOptions,
): Subscribable<SpawnEvent> {
  return new Observable((observer: Observer<SpawnEvent>) => {
    (async () => {
      const server = await SpawnServer.create();
      server.subscribe((client: RemoteSpawnClient) => {
        const subscription: Unsubscribable = client.subscribe((msg: ClientMessage) => {
          if (msg.action !== "info") {
            observer.error(new Error("Expected first message to be `info`"));
          } else {
            observer.next(new SpawnEvent(client, msg));
            subscription.unsubscribe();
          }
        });
      });

      const wrapperArgs: string[] = [OBSERVABLE_WRAPPER, server.host, server.port.toString(10)];

      withSpawnWrap({args: wrapperArgs}, async (api) => {
        return new Promise((resolve, reject) => {
          const outChunks: Buffer[] = [];
          const errChunks: Buffer[] = [];
          const proc = api.spawn(file, args, options);
          proc.stdout.on("data", (chunk) => outChunks.push(chunk));
          proc.stderr.on("data", (chunk) => errChunks.push(chunk));
          proc.on("close", () => {
            console.log(Buffer.concat(outChunks).toString("UTF-8"));
            console.log(Buffer.concat(errChunks).toString("UTF-8"));
            server.close();
            resolve();
          });
        });
      });
    })();
  });
}
