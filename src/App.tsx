import { Peer, DataConnection } from "peerjs";
import "./App.css";
import { useEffect, useState } from "react";

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

function App() {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [conn, setConn] = useState<PeerConnection | null>(null);
  const [thisId, setThisId] = useState<string | null>(null);
  const [inputId, setInputId] = useState<string>("");
  const [inputMsg, setInputMsg] = useState<Msg>({ text: "" });
  const [recievedMessage, setRecievedMessage] = useState<Msg | null>(null);

  useEffect(() => {
    const id = GeneratePeerId();
    setThisId(id);
    const peer = new Peer(id);
    setPeer(peer);

    peer.on("connection", (conn) => {
      conn.on("data", (data) => {
        const recieved: Msg = JSON.parse(data as string);
        console.log(recieved);
        setRecievedMessage(recieved);
      });
      conn.on("open", () => {
        const res: Msg = {
          text: `hello ${conn.peer}!  I am ${id}`,
        };
        conn.send(JSON.stringify(res));
      });
      setConn({ id: conn.peer, conn: conn });
    });
  }, []);

  const connect = (toId: string) => {
    const conn = peer!.connect(toId);
    conn.on("data", (data) => {
      const recieved: Msg = JSON.parse(data as string);
      console.log(recieved);
      setRecievedMessage({ text: recieved.text });
    });
    conn.on("open", () => {
      const greet: Msg = {
        text: `hi! I am ${thisId}`,
      };
      conn.send(JSON.stringify(greet));
    });
    setConn({ id: conn.peer, conn: conn });
  };

  const send = (msg: Msg) => {
    conn!.conn.send(JSON.stringify(msg));
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
    </>
  );
}

export default App;
