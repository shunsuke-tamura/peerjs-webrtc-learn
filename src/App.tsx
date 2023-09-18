import { Peer, DataConnection } from "peerjs";
import "./App.css";
import { useEffect, useState } from "react";

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

type sensorInfo = {
  acc: XYZ;
  gyro: XYZ;
};

type Message = {
  type: "sensorInit" | "sensorInfo";
  data: sensorInfo;
};

type Msg = {
  text: string;
};

type PeerConnection = {
  id: string;
  conn: DataConnection;
};

const GeneratePeerId = () => {
  const rand = () => {
    return Math.random().toString(36).substring(2);
  };
  return rand();
};

// radians to degrees
const rad2deg = (rad: number) => {
  return (rad * 180) / Math.PI;
};

function App() {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [conn, setConn] = useState<PeerConnection | null>(null);
  const [thisId, setThisId] = useState<string | null>(null);
  const [inputId, setInputId] = useState<string>("");
  const [inputMsg, setInputMsg] = useState<Msg>({ text: "" });
  const [recievedMessage, setRecievedMessage] = useState<Msg | null>(null);
  const [sensorInfo, setSensorInfo] = useState<sensorInfo | null>(null);
  const [initsensorInfo, setInitsensorInfo] = useState<sensorInfo>({
    acc: { x: 0, y: 0, z: 0 },
    gyro: { x: 0, y: 0, z: 0 },
  });

  useEffect(() => {
    const id = GeneratePeerId();
    setThisId(id);
    const peer = new Peer(id);
    setPeer(peer);

    peer.on("connection", (conn) => {
      conn.on("data", (data) => {
        // log data type
        console.log(typeof data);
        console.log(data);

        // const recieved: Msg = data as Msg;
        // console.log(recieved);
        // console.log(recieved);
        // setRecievedMessage(recieved);
        const recieved: Message = data as Message;
        console.log(recieved);

        if (recieved.type === "sensorInit") {
          setInitsensorInfo(recieved.data);
        } else if (recieved.type === "sensorInfo") {
          setSensorInfo((prev) => {
            if (!prev) return recieved.data;
            else {
              prev.gyro.x +=
                recieved.data.gyro.x > 0.02 ? recieved.data.gyro.x : 0;
              prev.gyro.y +=
                recieved.data.gyro.y > 0.02 ? recieved.data.gyro.y : 0;
              prev.gyro.z +=
                recieved.data.gyro.z > 0.02 ? recieved.data.gyro.z : 0;
              console.log(prev);
              return prev;
            }
          });
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
    console.log(ab);

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
      {sensorInfo && (
        <div
          style={{
            width: 5,
            transform: `rotate(${
              rad2deg(sensorInfo.gyro.z) - rad2deg(initsensorInfo.gyro.z)
            }deg)`,
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
      )}
    </>
  );
}

export default App;
