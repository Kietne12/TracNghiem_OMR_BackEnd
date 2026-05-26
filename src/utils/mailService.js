import tls from "tls";

const DEFAULT_SMTP_HOST = "smtp.gmail.com";
const DEFAULT_SMTP_PORT = 465;

const readLine = (socket, timeoutMs = 15000) => new Promise((resolve, reject) => {
  let buffer = "";
  const timer = setTimeout(() => {
    cleanup();
    reject(new Error("SMTP timeout"));
  }, timeoutMs);

  const cleanup = () => {
    clearTimeout(timer);
    socket.off("data", onData);
    socket.off("error", onError);
  };

  const onError = (error) => {
    cleanup();
    reject(error);
  };

  const onData = (chunk) => {
    buffer += chunk.toString("utf8");
    const lines = buffer.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return;

    const lastLine = lines[lines.length - 1];
    if (/^\d{3} /.test(lastLine)) {
      cleanup();
      resolve(buffer);
    }
  };

  socket.on("data", onData);
  socket.on("error", onError);
});

const expectCode = async (socket, expectedCodes) => {
  const response = await readLine(socket);
  const code = response.slice(0, 3);
  if (!expectedCodes.includes(code)) {
    throw new Error(`SMTP loi ${code}: ${response.trim()}`);
  }
  return response;
};

const writeCommand = async (socket, command, expectedCodes) => {
  socket.write(`${command}\r\n`);
  return expectCode(socket, expectedCodes);
};

const encodeHeader = (value) => {
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
};

const escapeData = (value) => value.replace(/\r?\n\./g, "\r\n..");

export const sendMail = async ({ to, subject, text }) => {
  const user = process.env.SMTP_USER || process.env.MAIL_USER;
  const pass = process.env.SMTP_APP_PASSWORD || process.env.MAIL_APP_PASSWORD;
  const from = process.env.SMTP_FROM || user;
  const host = process.env.SMTP_HOST || DEFAULT_SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || DEFAULT_SMTP_PORT);

  if (!user || !pass || !from) {
    throw new Error("Chua cau hinh SMTP_USER va SMTP_APP_PASSWORD trong .env");
  }

  const socket = tls.connect({
    host,
    port,
    servername: host,
  });

  try {
    await expectCode(socket, ["220"]);
    await writeCommand(socket, "EHLO localhost", ["250"]);
    await writeCommand(socket, "AUTH LOGIN", ["334"]);
    await writeCommand(socket, Buffer.from(user).toString("base64"), ["334"]);
    await writeCommand(socket, Buffer.from(pass).toString("base64"), ["235"]);
    await writeCommand(socket, `MAIL FROM:<${from}>`, ["250"]);
    await writeCommand(socket, `RCPT TO:<${to}>`, ["250", "251"]);
    await writeCommand(socket, "DATA", ["354"]);

    const message = [
      `From: ${encodeHeader("Trac Nghiem OMR")} <${from}>`,
      `To: <${to}>`,
      `Subject: ${encodeHeader(subject)}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      escapeData(text),
      ".",
    ].join("\r\n");

    socket.write(`${message}\r\n`);
    await expectCode(socket, ["250"]);
    await writeCommand(socket, "QUIT", ["221"]);
  } finally {
    socket.end();
  }
};
