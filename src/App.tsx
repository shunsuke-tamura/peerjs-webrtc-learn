import { Peer, DataConnection } from "peerjs";
import "./App.css";
import { useEffect, useState, useRef } from "react";
import QRCode from "./QRCode";
import { get } from "http";

type XYZ = {
  x: number;
  y: number;
  z: number;
};

type XY = {
  x: number;
  y: number;
};

type SensorPerInfo = {
  acc: XYZ;
  gyro: XYZ;
};

type Message = {
  type:
    | "sensorInit"
    | "sensorInfo"
    | "shoot"
    | "shootRes"
    | "userSetting"
    | "userSettingRes";
  data: SensorPerInfo | Shoot | UserSetting | ShootRes;
};

type Msg = {
  text: string;
};

type PeerConnection = {
  id: string;
  conn: DataConnection;
};

type User = {
  id: number;
  peerId: string;
  name: string;
  pointer: XY;
};

type UserSetting = {
  name: string;
};

type UserSettingRes = {
  id: number;
  name: string;
  colorCode: string;
};

type Shoot = {
  sensorPerInfo: SensorPerInfo;
};

type ShootRes = {
  score: number | null;
};

type Target = {
  size: number;
  position: XY;
  score: number;
};

// getColorCodeFromId
const getColorCodeFromId = (id: number): string => {
  const index = id - 1;
  const colors = ["FF0000", "0000FF", "008000", "FFFF00", "808080"];
  return colors[index % colors.length];
};

// getFillColorFromId
const getFillColorFromId = (id: number): string => {
  const index = id - 1;
  const colors = [
    "rgba(255,0,0,0.5)",
    "rgba(0,0,255,0.5)",
    "rgba(0,128,0,0.5)",
    "rgba(255,255,0,0.5)",
    "rgba(128,128,128,0.5)",
  ];
  return colors[index % colors.length];
};

// getStrokeColorFromId
const getStrokeColorFromId = (id: number): string => {
  const index = id - 1;
  const colors = [
    "rgba(255,0,0,0.8)",
    "rgba(0,0,255,0.8)",
    "rgba(0,128,0,0.8)",
    "rgba(255,255,0,0.8)",
    "rgba(128,128,128,0.8)",
  ];
  return colors[index % colors.length];
};
// const GeneratePeerId = () => {
//   const rand = () => {
//     return Math.random().toString(36).substring(2);
//   };
//   return rand();
// };

function App() {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [conn, setConn] = useState<PeerConnection | null>(null);
  const [thisId, setThisId] = useState<string | null>(null);
  // const [inputId, setInputId] = useState<string>("");
  const [inputMsg, setInputMsg] = useState<Msg>({ text: "" });
  const [recievedMessage, setRecievedMessage] = useState<Msg | null>(null);
  const [sensorPerInfo, setSensorPerInfo] = useState<SensorPerInfo | null>(
    null
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [targets, setTargets] = useState<Target[] | null>(null);
  const TargetNum = 3;
  const [users, setUsers] = useState<User[]>([]);
  const [broken, setBroken] = useState<Target | null>(null);

  const generateTarget = (width: number, height: number): Target => {
    const size = Math.floor(Math.random() * 40) + 20;
    const position = {
      x: Math.random() * (width - size),
      y: Math.random() * (height - size),
    };
    const score = Math.floor(Math.random() * 10);
    return { size, position, score };
  };

  const targetHit = (target: Target, pointer: XY): Target | null => {
    const x = pointer.x - target.position.x;
    const y = pointer.y - target.position.y;
    const distance = Math.sqrt(x * x + y * y);
    if (distance < target.size / 2) {
      return target;
    }
    return null;
  };

  const sensorPerInfoToPointer = (sensorPerInfo: SensorPerInfo): XY => {
    return {
      x: 600 - (600 * sensorPerInfo.gyro.z + 600 / 2),
      y: 600 - (600 * sensorPerInfo.gyro.x + 600 / 2),
    };
  };

  useEffect(() => {
    // const id = GeneratePeerId();
    // const id = "zxrsnb2oxoe";
    const id = self.crypto.randomUUID();
    setThisId(id);
    const peer = new Peer(id);
    setPeer(peer);

    peer.on("connection", (conn) => {
      conn.on("data", (data) => {
        const recieved: Message = data as Message;

        // Message.type handling
        if (recieved.type === "sensorInit") {
          // setInitSensorInfo(recieved.data);
          // console.log(recieved.data);
        } else if (recieved.type === "sensorInfo") {
          setUsers((prev) => {
            let u: User | undefined;
            prev.forEach((user, index) => {
              if (user.peerId === conn.peer) {
                u = user;
                prev.splice(index, 1);
              }
            });

            const user = u
              ? {
                  id: u.id,
                  peerId: u.peerId,
                  name: u.name,
                  pointer: sensorPerInfoToPointer(
                    recieved.data as SensorPerInfo
                  ),
                }
              : u;
            const newUsers = user ? [...prev, user] : prev;
            // sort by id
            newUsers.sort((a, b) => {
              if (a.id < b.id) return -1;
              if (a.id > b.id) return 1;
              return 0;
            });
            return newUsers;
          });
          setSensorPerInfo(recieved.data as SensorPerInfo);
        } else if (recieved.type === "userSetting") {
          setUsers((prev) => {
            const user: User = {
              id: prev.length + 1,
              peerId: conn.peer,
              name: (recieved.data as UserSetting).name,
              pointer: { x: 0, y: 0 },
            };
            const res: Message = {
              type: "userSettingRes",
              data: {
                id: user.id,
                name: user.name,
                colorCode: getColorCodeFromId(user.id),
              } as UserSettingRes,
            };
            send(res, conn);
            return [...prev, user];
          });
        } else if (recieved.type === "shoot") {
          console.log("shoot");

          const shoot: Shoot = recieved.data as Shoot;
          let hit: Target | null = null;
          setTargets((prev) => {
            console.log(prev);
            if (!prev) return null;

            for (let i = 0; i < prev.length; i++) {
              hit = targetHit(
                prev[i],
                sensorPerInfoToPointer(shoot.sensorPerInfo)
              );
              if (hit) {
                prev!.splice(i, 1);
                break;
              }
            }
            console.log(sensorPerInfoToPointer(shoot.sensorPerInfo));

            const res: Message = {
              type: "shootRes",
              data: {
                score: hit ? hit.score : null,
              } as ShootRes,
            };
            setBroken(hit);
            setTimeout(() => {
              setBroken(null);
              if (hit) {
                setTargets((prev) => {
                  if (prev === null) return [generateTarget(600, 600)];
                  return [...prev, generateTarget(600, 600)];
                });
              }
            }, 3000);
            send(res, conn);

            return prev;
          });
        }
      });
      conn.on("open", () => {
        const res: Msg = {
          text: `hello ${conn.peer}!  I am ${id}`,
        };
        send(res, conn);
      });
      setConn({ id: conn.peer, conn: conn });
    });

    for (let i = 0; i < TargetNum; i++) {
      setTargets((prev) => {
        if (prev === null) return [generateTarget(600, 600)];
        return [...prev, generateTarget(600, 600)];
      });
    }

    return () => {
      // peer.destroy();
    };
  }, []);

  const drawPointer = (ctx: CanvasRenderingContext2D, user: User) => {
    // console.log(user);

    ctx.beginPath();
    ctx.arc(user.pointer.x, user.pointer.y, 10, 0, Math.PI * 2, true);
    ctx.fillStyle = getFillColorFromId(user.id);
    ctx.fill();
    ctx.strokeStyle = getStrokeColorFromId(user.id);
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.font = "bold 14px Arial";
    ctx.fillStyle = "gray";
    ctx.fillText(user.id.toString(), user.pointer.x, user.pointer.y - 5);
  };

  const drawTargets = (ctx: CanvasRenderingContext2D) => {
    // console.log(targets);

    targets!.forEach((target) => {
      ctx.beginPath();
      ctx.arc(
        target.position.x,
        target.position.y,
        target.size / 2,
        0,
        Math.PI * 2,
        true
      );
      ctx.fillStyle = "lightpink";
      ctx.fill();
      ctx.strokeStyle = "deeppink";
      ctx.lineWidth = 5;
      ctx.stroke();
    });
    if (broken) {
      ctx.beginPath();
      ctx.arc(broken.position.x, broken.position.y, 18, 0, Math.PI * 2, true);
      ctx.fillStyle = `rgba(200,200,200,0.8)`;
      ctx.fill();
      ctx.font = "bold 18px Arial";
      ctx.fillStyle = "black";
      ctx.fillText(
        `+${broken.score}`,
        broken.position.x - 9,
        broken.position.y + 7
      );
    }
  };

  useEffect(() => {
    console.log("draw");

    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const width = canvasRef.current!.width;
    const height = canvasRef.current!.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fill();

    if (!targets) return;
    drawTargets(ctx);
    // ctx.translate(width / 2, height / 2);
    users.forEach((user) => {
      drawPointer(ctx, user);
    });
    // ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [sensorPerInfo, users, targets]);

  // const connect = (toId: string) => {
  //   const conn = peer!.connect(toId);
  //   conn.on("data", (data) => {
  //     // ArrayBuffer to Json
  //     const json = new TextDecoder().decode(data as ArrayBuffer);
  //     const recieved: Msg = JSON.parse(json as string);
  //     setRecievedMessage({ text: recieved.text });
  //   });
  //   conn.on("open", () => {
  //     const greet: Msg = {
  //       text: `hi! I am ${thisId}`,
  //     };
  //     // Json to ArrayBuffer
  //     send(greet, conn);
  //   });
  //   setConn({ id: conn.peer, conn: conn });
  // };

  const send = (msg: unknown, conn: DataConnection) => {
    // Json to ArrayBuffer
    const ab = new TextEncoder().encode(JSON.stringify(msg)).buffer;
    conn.send(new Uint8Array(ab));
  };

  return (
    <>
      <div>I am {thisId}</div>
      <br />
      {/* <div
        style={{
          display: "flex",
        }}
      >
        <input
          type="text"
          value={inputId}
          onChange={(e) => setInputId(e.target.value)}
        />
        <button onClick={() => connect(inputId)}>connect</button>
      </div> */}
      <br />
      {thisId && (
        <div style={{ backgroundColor: "white" }}>
          <QRCode id={thisId}></QRCode>
        </div>
      )}
      {conn && (
        <>
          <div>connected to {conn.id}</div>
          <div
            style={{
              display: "flex",
            }}
          >
            <input
              type="text"
              value={inputMsg.text}
              onChange={(e) => setInputMsg({ text: e.target.value })}
            />
            {/* <button onClick={() => send(inputMsg)}>send</button> */}
          </div>
        </>
      )}
      {recievedMessage && <div>recieved message: {recievedMessage!.text}</div>}
      {/* {sensorPerInfo && (
        <div>
          <div
            style={{
              width: 5,
              transform: `rotate(${sensorPerInfo.gyro.z * 180}deg)`,
            }}
          >
            <div
              style={{
                backgroundColor: "red",
                width: 5,
                height: 80,
              }}
            ></div>
            <div
              style={{
                backgroundColor: "blue",
                width: 5,
                height: 80,
              }}
            ></div>
          </div>
          <canvas width={600} height={600} ref={canvasRef}></canvas>
        </div>
      )} */}
      <canvas width={600} height={600} ref={canvasRef}></canvas>
    </>
  );
}

export default App;
