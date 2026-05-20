import { QRCodeSVG } from "qrcode.react";

type Props = {
  url: string;
  size?: number;
  className?: string;
};

/** رمز QR لفتح رابط الربط على الآيباد */
const DevicePairingQr = ({ url, size = 200, className }: Props) => (
  <div
    className={className}
    style={{
      background: "#fff",
      padding: 12,
      borderRadius: 16,
      display: "inline-block",
    }}
  >
    <QRCodeSVG value={url} size={size} level="M" includeMargin={false} />
  </div>
);

export default DevicePairingQr;
