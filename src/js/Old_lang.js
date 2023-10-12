(function ($, PLUGIN_ID) {
  "use strict";

  const CONF = kintone.plugin.app.getConfig(PLUGIN_ID);
  let translateEngine = JSON.parse(CONF.translate_engine) || {};
  let translateEngineType = translateEngine.type;
  let engineURL = translateEngine.url;   //'https://translate.googleapis.com/translate_a'
  let globalLanguage = CONF.default_language;

  if (window.BoK === undefined) window.BoK = {};
  var BoK = window.BoK.eAutoTrans = {
    transText: async function (destLang, srcText, srcLang, srcType) {
      let texts = srcText;
      let translatedText = '';
      console.log('src: ' + srcLang + '  Dest Leng: ' + destLang);
      if (!texts) return '';
      if (translateEngineType){
        switch (srcType) {
          case 'SINGLE_LINE_TEXT':
            if (translateEngineType === 'google_tran_api') {
              translatedText = await this.googleTrans(srcText, srcLang, destLang);
            }
            else if (translateEngineType === 'my_memory_api') {
              translatedText = await this.myMemoryTrans(srcText, srcLang, destLang);
            }
            else if (translateEngineType === 'deepl_api') {
              translatedText = await this.myDeepLTrans(srcText, srcLang, destLang);
            }
            return translatedText;
          case 'MULTI_LINE_TEXT':
            texts = texts.split('\n')
            for await (let item of texts) {
              if (!item) continue;
              if (translateEngineType === 'google_tran_api') {
                translatedText += `${await this.googleTrans(item, srcLang, destLang)}\n`;
              }
              else if (translateEngineType === 'my_memory_api') {
                translatedText += `${await this.myMemoryTrans(item, srcLang, destLang)}\n`;
              }
              else if (translateEngineType === 'deepl_api') {
                translatedText += `${await this.myDeepLTrans(item, srcLang, destLang)}\n`;
              }
            }
            console.log('result');
            console.log(translatedText);
            return translatedText;
          case 'RICH_TEXT':
            // const parser = new DOMParser();
            // let doc = '';
            // let elements = '';
            // console.log('richTextVar::', texts);
            // // Parse the HTML string
            // doc = parser.parseFromString(texts, 'text/html');
            // elements = doc.body.firstChild.childNodes;  //get all element nodes
            // console.log('doc', doc.body.firstChild.childNodes);
            // //loop for get text in div only
            // let txtArr = [];
            // elements.forEach(node => {
            //   txtArr.push(node.textContent);
            // })
            // console.log(txtArr);
            // if (txtArr.length <= 0) return kintone.app.record.set(event, record[srcField].value = '');

            const parser = new DOMParser();
            const doc = parser.parseFromString(texts, 'text/html');
            const txtArr = [];

            const setOnlyTextInHtmlToArray = (node) => {
              if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') {
                txtArr.push(node.textContent.trim());
              } else {
                for (const childNode of node.childNodes) {
                  setOnlyTextInHtmlToArray(childNode);
                }
              }
            };

            setOnlyTextInHtmlToArray(doc.body);

            console.log(txtArr);
            //translate text and replace it to old values
            for await (const item of txtArr) {
              if (item == '' || /^\s+$/.test(item)) {
                texts = texts.replace(`${item}`, `${item}`);
              } else {
                if (translateEngineType === 'google_tran_api') {
                  console.log(item)
                  texts = texts.replace(`${item}`, await this.googleTrans(item, srcLang, destLang));
                }
                else if (translateEngineType === 'my_memory_api') {
                  texts = texts.replace(`${item}`, await this.myMemoryTrans(item, srcLang, destLang));
                }
                else if (translateEngineType === 'deepl_api') {
                  texts = texts.replace(`${item}`, await this.myDeepLTrans(item, srcLang, destLang));
                }
              }
            }
            console.log('result');
            console.log(texts);
            return texts;
          default:
        }
      } else {
        return;
      }
    },

    showLang: function (showLang) {
      globalLanguage = showLang || globalLanguage;
      return globalLanguage;
    },

    trans: async function () {

    },

    googleTrans: async function (srcText, srcLang, destLang) {
      try {
        let url = engineURL;
        if (!url) return alert('Translate engine url not setting in config');
        let trans = await axios({ method: 'GET', url: `${url}/single?client=gtx&sl=${srcLang}&tl=${destLang}&dt=t&q=${srcText}` })

        if (trans.status === 200) {
          let txt = '';
          trans.data[0].forEach((item) => {
            txt += item[0];
          });
          // Calculate the leading and trailing spaces to restore
          var leadingSpaces = srcText.match(/^\s*/)[0];
          var trailingSpaces = srcText.match(/\s*$/)[0];

          // Return the translated text with the preserved spaces
          return leadingSpaces + txt + trailingSpaces;
        } else {
          throw new Error('Translation request failed with status: ' + trans.status);
        }
      } catch (error) {
        console.error('Error:', error.message);
      }
    },

    myMemoryTrans: async function (srcText, srcLang, destLang) {
      try {
        let url = engineURL;
        if (!url) return alert('Translate engine url not setting in config');
        let trans = await axios({ method: 'GET', url: `${url}/get?q=${srcText}&langpair=${srcLang}|${destLang}` })

        if (trans.status === 200) {
          let txt = trans.data.responseData.translatedText;
          // Calculate the leading and trailing spaces to restore
          var leadingSpaces = srcText.match(/^\s*/)[0];
          var trailingSpaces = srcText.match(/\s*$/)[0];

          // Return the translated text with the preserved spaces
          return leadingSpaces + txt + trailingSpaces;
          // return txt;
        } else {
          throw new Error(
            'Translation request failed with status: ' +
            response.status +
            'MyMemory API status: ' +
            response.data.responseStatus
          );
        }
      } catch (error) {
        console.error('Error:', error.message);
      }
    },

    myDeepLTrans: async function (destLang, srcText, srcLang) {
      try {
        let url = engineURL;
        let apiKey = '';
        if (!url) return alert('Translate engine url not setting in config');
        let trans = await axios({ method: 'POST', url: `${url}/get?q=${srcText}&langpair=${srcLang}|${destLang}`, headers: { 'Authorization': `DeepL-Auth-Key ${apiKey}` } })

        if (trans.status === 200) {
          console.log(trans.data.responseData);
          let txt = trans.data.responseData.translations[0].text;
          console.log(txt);
          // Calculate the leading and trailing spaces to restore
          var leadingSpaces = srcText.match(/^\s*/)[0];
          var trailingSpaces = srcText.match(/\s*$/)[0];

          // Return the translated text with the preserved spaces
          return leadingSpaces + txt + trailingSpaces;
          // return txt;
        } else {
          throw new Error(
            'Translation request failed with status: ' +
            response.status +
            'DeepL API status: ' +
            response.data.responseStatus
          );
        }
      } catch (error) {
        console.error('Error:', error.message);
      }
    }
  }
  window.BoK.eAutoTrans = BoK;
})(jQuery, kintone.$PLUGIN_ID);