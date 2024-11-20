const sessionName = "rickyCreds";
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  jidDecode,
  proto,
  getContentType,
  Browsers,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const axios = require("axios");
const chalk = require("chalk");
const figlet = require("figlet");
const readline = require("readline");
const PhoneNumber = require("awesome-phonenumber");
const _ = require("lodash");

const usePairingCode = true;
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });



const question = (text) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(text, resolve);
  });
};

const color = (text, color) => {
  return !color ? chalk.green(text) : chalk.keyword(color)(text);
};

async function startSession() {
  const { state, saveCreds } = await useMultiFileAuthState(`./${sessionName ? sessionName : "session"}`);
  const { version, isLatest } = await fetchLatestBaileysVersion();

  console.log(`using WA v${version.join(".")}, isLatest: ${isLatest}`);
  console.log(color(figlet.textSync("Alicia AI", {
    font: "Standard",
    horizontalLayout: "default",
    vertivalLayout: "default",
    whitespaceBreak: false,
  }), "white"));

  const connectionOptions = {
    version,
    keepAliveIntervalMs: 30000,
    printQRInTerminal: !usePairingCode,
    logger: pino({ level: "fatal" }),
    auth: state,
    browser: [ "Ubuntu", "Chrome", "20.0.04" ],
  };

  const client = makeWASocket(connectionOptions);

  if (usePairingCode && !client.authState.creds.registered) {
    const phoneNumber = await question('Masukan Nomer Yang Aktif Tanpa + , - Dan spasi:\n');
    const code = await client.requestPairingCode(phoneNumber.trim());
    console.log(chalk.red.bold(`=> [ ${code} ] <=`));
  }

  store.bind(client.ev);

  client.ev.on("messages.upsert", async (chatUpdate) => {
    try {
      let mek = chatUpdate.messages[0];
      if (!mek.message) return;
      mek.message = Object.keys(mek.message)[0] === "ephemeralMessage" ? mek.message.ephemeralMessage.message : mek.message;
      if (mek.key && mek.key.remoteJid === "status@broadcast") return;
      if (!client.public && !mek.key.fromMe && chatUpdate.type === "notify") return;
      const m = smsg(client, mek, store);
      await client.readMessages([m.key]);
      if (!client.public && !m.key.fromMe && chatUpdate.type === 'notify') return;
      if (m.sender.includes('6283873321433')) return;
      if (m.key.id.startsWith('BAE5') && m.key.id.length === 16) return;
      require("./RickyPurPur.js")(client, m, chatUpdate, store);
    } catch (err) {
      console.error(err);
    }
  });

  client.ev.on("contacts.update", (update) => {
    for (let contact of update) {
      let id = client.decodeJid(contact.id);
      if (store && store.contacts) store.contacts[id] = { id, name: contact.notify };
    }
  });

  client.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      switch (reason) {
        case DisconnectReason.badSession:
          console.log(`Bad Session File, Please Delete Session and Scan Again`);
          process.exit();
        case DisconnectReason.connectionClosed:
          console.log("Connection closed, reconnecting....");
          startSession();
          break;
        case DisconnectReason.connectionLost:
          console.log("Connection Lost from Server, reconnecting...");
          startSession();
          break;
        case DisconnectReason.connectionReplaced:
          console.log("Connection Replaced, Another New Session Opened, Please Restart Bot");
          process.exit();
        case DisconnectReason.loggedOut:
          console.log(`Device Logged Out, Please Delete Folder Session and Scan Again.`);
          process.exit();
        case DisconnectReason.restartRequired:
          console.log("Restart Required, Restarting...");
          startSession();
          break;
        case DisconnectReason.timedOut:
          console.log("Connection TimedOut, Reconnecting...");
          startSession();
          break;
        default:
          console.log(`Unknown DisconnectReason: ${reason}|${connection}`);
          startSession();
      }
    } else if (connection === "open") {
      const botNumber = await client.decodeJid(client.user.id);
      console.log(color("Bot successfully connected to server", "green"));
    }
  });

  client.ev.on("creds.update", saveCreds);

  const getBuffer = async (url, options) => {
    try {
      const res = await axios({
        method: "get",
        url,
        headers: { DNT: 1, "Upgrade-Insecure-Request": 1 },
        ...options,
        responseType: "arraybuffer",
      });
      return res.data;
    } catch (err) {
      return err;
    }
  };

  client.kalkulator = (input) => {
    input = input.replace(/×/g, '*').replace(/÷/g, '/').replace(/:/g, '/');
    input = input.replace(/\./g, '').replace(/,/g, '.');

    const regex = /(-?\d+(\.\d+)?(\s*[+\-*\/]\s*-?\d+(\.\d+)?)*)/g;
    const matches = input.match(regex);

    if (!matches) {
      return false;
    }

    if (matches.length > 1) {
      return matches.map(function(match) {
        try {
          return `${eval(match)}`;
        } catch (error) {
          return false;
        }
      });
    }

    try {
      const match = matches[0];
      return `${eval(match)}`;
    } catch (error) {
      return false;
    }
  };

  client.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {};
      return (decode.user && decode.server && decode.user + "@" + decode.server) || jid;
    } else return jid;
  };

  client.public = true;

  client.getName = async (jid, withoutContact = false) => {
    id = client.decodeJid(jid);
    withoutContact = client.withoutContact || withoutContact;
    let v;
    if (id.endsWith("@g.us")) {
      v = store.contacts[id] || {};
      if (!(v.name || v.subject)) v = await client.groupMetadata(id);
      return v.name || v.subject || PhoneNumber("+" + id.replace("@s.whatsapp.net", "")).getNumber("international");
    } else {
      v = id === "0@s.whatsapp.net"
        ? { id, name: "WhatsApp" }
        : id === client.decodeJid(client.user.id)
        ? client.user
        : store.contacts[id] || {};
      return (withoutContact ? "" : v.name) || v.subject || v.verifiedName || PhoneNumber("+" + jid.replace("@s.whatsapp.net", "")).getNumber("international");
    }
  };

  client.sendImage = async (jid, path, caption = "", quoted = "", options) => {
    let buffer = Buffer.isBuffer(path)
      ? path
      : /^data:.*?\/.*?;base64,/i.test(path)
        ? Buffer.from(path.split`,`[1], "base64")
        : /^https?:\/\//.test(path)
          ? await getBuffer(path)
          : fs.existsSync(path)
            ? fs.readFileSync(path)
            : Buffer.alloc(0);
    return await client.sendMessage(jid, { image: buffer, caption, ...options }, { quoted });
  };

  client.sendText = (jid, text, quoted = "", options) => client.sendMessage(jid, { text, ...options }, { quoted });

  client.cMod = (jid, copy, text = "", sender = client.user.id, options = {}) => {
    let mtype = Object.keys(copy.message)[0];
    let isEphemeral = mtype === "ephemeralMessage";
    if (isEphemeral) {
      mtype = Object.keys(copy.message.ephemeralMessage.message)[0];
    }
    let msg = isEphemeral ? copy.message.ephemeralMessage.message : copy.message;
    let content = msg[mtype];
    if (typeof content === "string") msg[mtype] = text || content;
    else if (content.caption) content.caption = text || content.caption;
    else if (content.text) content.text = text || content.text;
    if (typeof content !== "string") msg[mtype] = { ...content, ...options };
    if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant;
    if (copy.key.remoteJid.includes("@s.whatsapp.net")) sender = sender || copy.key.remoteJid;
    else if (copy.key.remoteJid.includes("@broadcast")) sender = sender || copy.key.remoteJid;
    copy.key.remoteJid = jid;
    copy.key.fromMe = sender === client.user.id;
    return proto.WebMessageInfo.fromObject(copy);
  };

  return client;
}

startSession();

process.on('uncaughtException', (err) => {
  console.log('Caught exception: ', err);
});

fs.watchFile(require.resolve(__filename), () => {
  fs.unwatchFile(require.resolve(__filename));
  console.log(chalk.redBright(`Update ${__filename}`));
  delete require.cache[require.resolve(__filename)];
  require(require.resolve(__filename));
});

function smsg(conn, m, store) {
  if (!m) return m;
  let M = proto.WebMessageInfo;
  if (m.key) {
    m.id = m.key.id;
    m.isBaileys = m.id.startsWith("BAE5") && m.id.length === 16;
    m.chat = m.key.remoteJid;
    m.fromMe = m.key.fromMe;
    m.isGroup = m.chat.endsWith("@g.us");
    m.sender = conn.decodeJid((m.fromMe && conn.user.id) || m.participant || m.key.participant || m.chat || "");
    if (m.isGroup) m.participant = conn.decodeJid(m.key.participant) || "";
  }
  if (m.message) {
    m.mtype = getContentType(m.message);
    m.msg = m.mtype == "viewOnceMessage" ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype];
    m.body = m.message.conversation || m.msg.caption || m.msg.text || (m.mtype == "viewOnceMessage" ? m.msg.contentText : "") || "";
    m.mentions = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
    try {
      const quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null;
      if (quoted) {
        let type = getContentType(quoted);
        m.quoted = m.msg.contextInfo.quotedMessage;
        if (type === "conversation") {
          m.quoted = { text: quoted.conversation };
        } else {
          m.quoted = quoted[type];
        }
        m.quoted.mtype = type;
        m.quoted.id = m.msg.contextInfo.stanzaId;
        m.quoted.chat = conn.decodeJid(m.msg.contextInfo.remoteJid || m.chat || m.sender);
        m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith("BAE5") && m.quoted.id.length === 16 : false;
        m.quoted.sender = conn.decodeJid(m.msg.contextInfo.participant);
        m.quoted.fromMe = m.quoted.sender === conn.user.id;
        m.quoted.text = m.quoted.text || m.quoted.caption || "";
        m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
        let vM = m.quoted.fakeObj = M.fromObject({
          key: {
            fromMe: m.quoted.fromMe,
            remoteJid: m.quoted.chat,
            id: m.quoted.id,
          },
          message: quoted,
          ...(m.isGroup ? { participant: m.quoted.sender } : {}),
        });

        m.quoted.delete = () => conn.sendMessage(m.quoted.chat, { delete: vM.key });
        m.quoted.download = () => conn.downloadMediaMessage(m.quoted);
      }
    } catch (e) {
      m.quoted = null;
    }
    m.name = m.pushName || conn.getName(m.sender);
  }
  if (m.msg && m.msg.url) m.download = () => conn.downloadMediaMessage(m.msg);
  m.reply = (text, chatId = m.chat, options = {}) => Buffer.isBuffer(text) ? conn.sendMedia(chatId, text, "file", "", m, { ...options }) : conn.sendText(chatId, text, m, { ...options });
  m.copy = () => smsg(conn, M.fromObject(M.toObject(m)));
  m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => conn.copyNForward(jid, m, forceForward, options);
  return m;
}
