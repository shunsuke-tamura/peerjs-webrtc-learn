import QRCode from "qrcode.react";

function QRCodeGenerator({ id }: { id: string }) {
  return (
    <div>
      <h2>読んで参加</h2>
      <QRCode value={id} />
    </div>
  );
}

export default QRCodeGenerator;
