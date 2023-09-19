import { Peer, DataConnection } from "peerjs";
import "./App.css";
import { useEffect, useState, useRef } from "react";

type XYZ = {
  x: number;
  y: number;
  z: number;
};

/**
type = "sensorInfo" | "sensorInit"
{
  "type": "sensorInit",
  "data": {
    "acc": {
      "x": 0.1,
      "y": 0.2,
      "z": 0.3
    },
    "gyro": {
      "x": 0.1,
      "y": 0.2,
      "z": 0.3
    }
  }
}
*/

// type PointerPosition = {
//   x: number;
//   y: number;
// };

type SensorPerInfo = {
  acc: XYZ;
  gyro: XYZ;
};

type Message = {
  type: "sensorInit" | "sensorInfo";
  data: SensorPerInfo;
};

type Msg = {
  text: string;
};

type PeerConnection = {
  id: string;
  conn: DataConnection;
};

// const GeneratePeerId = () => {
//   const rand = () => {
//     return Math.random().toString(36).substring(2);
//   };
//   return rand();
// };

// radians to degrees
// const rad2deg = (rad: number) => {
//   return (rad * 180) / Math.PI;
// };

function App() {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [conn, setConn] = useState<PeerConnection | null>(null);
  const [thisId, setThisId] = useState<string | null>(null);
  const [inputId, setInputId] = useState<string>("");
  const [inputMsg, setInputMsg] = useState<Msg>({ text: "" });
  const [recievedMessage, setRecievedMessage] = useState<Msg | null>(null);
  const [sensorPerInfo, setSensorPerInfo] = useState<SensorPerInfo | null>(
    null
  );
  // const [initSensorInfo, setInitSensorInfo] = useState<SensorPerInfo>({
  //   acc: { x: 0, y: 0, z: 0 },
  //   gyro: { x: 0, y: 0, z: 0 },
  // });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // const id = GeneratePeerId();
    const id = "5q9dw3t2au6";
    setThisId(id);
    const peer = new Peer(id);
    setPeer(peer);

    peer.on("connection", (conn) => {
      conn.on("data", (data) => {
        // const recieved: Msg = data as Msg;
        // console.log(recieved);
        // console.log(recieved);
        // setRecievedMessage(recieved);
        const recieved: Message = data as Message;
        if (recieved.data.gyro.z > 0.02) console.log(recieved);

        if (recieved.type === "sensorInit") {
          // setInitSensorInfo(recieved.data);
          console.log(recieved.data);
        } else if (recieved.type === "sensorInfo") {
          setSensorPerInfo(recieved.data);
        }
      });
      conn.on("open", () => {
        const res: Msg = {
          text: `hello ${conn.peer}!  I am ${id}`,
        };
        // Json to ArrayBuffer
        const ab = new TextEncoder().encode(JSON.stringify(res)).buffer;
        conn.send(ab);
      });
      setConn({ id: conn.peer, conn: conn });
    });
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const width = canvasRef.current!.width;
    const height = canvasRef.current!.height;
    ctx.clearRect(0, 0, width, height);
    console.log(sensorPerInfo!.gyro.z);
    console.log(sensorPerInfo!.gyro.x);
    ctx.beginPath();
    ctx.arc(
      width - (width * sensorPerInfo!.gyro.z + width / 2),
      height - (height * sensorPerInfo!.gyro.x + height / 2),
      10,
      0,
      Math.PI * 2,
      true
    );
    ctx.fillStyle = "lightskyblue";
    ctx.fill();
    ctx.strokeStyle = "deepskyblue";
    ctx.lineWidth = 5;
    ctx.stroke();
  }, [sensorPerInfo]);

  const connect = (toId: string) => {
    const conn = peer!.connect(toId);
    conn.on("data", (data) => {
      // ArrayBuffer to Json
      const json = new TextDecoder().decode(data as ArrayBuffer);
      const recieved: Msg = JSON.parse(json as string);
      setRecievedMessage({ text: recieved.text });
    });
    conn.on("open", () => {
      const greet: Msg = {
        text: `hi! I am ${thisId}`,
      };
      // Json to ArrayBuffer
      const ab = new TextEncoder().encode(JSON.stringify(greet)).buffer;
      conn.send(ab);
    });
    setConn({ id: conn.peer, conn: conn });
  };

  const send = (msg: Msg) => {
    // Json to ArrayBuffer
    const ab = new TextEncoder().encode(JSON.stringify(msg)).buffer;
    conn!.conn.send(ab);
  };

  return (
    <>
      <div>I am {thisId}</div>
      <br />
      <div
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
      </div>
      <br />
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
            <button onClick={() => send(inputMsg)}>send</button>
          </div>
        </>
      )}
      {recievedMessage && <div>recieved message: {recievedMessage!.text}</div>}
      {sensorPerInfo && (
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
      )}
    </>
  );
}

export default App;
