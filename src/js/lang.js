(function ($, PLUGIN_ID) {
    "use strict";
  
    const CONF = kintone.plugin.app.getConfig(PLUGIN_ID);
    const allLanguage = window.language_pack();
    const translateEngine = JSON.parse(CONF.translate_engine) || {};
    const translateEngineType = translateEngine.type;
    const translateEngineURL = translateEngine.url;   //'https://translate.googleapis.com/translate_a'
    const G_translateFields = JSON.parse(CONF.translate_fields);
  
    if (window.BoK === undefined) window.BoK = {};
    var BoK = window.BoK.eAutoTrans = {
      transText: async function (destLang, srcText, srcLang, srcType) {
        let texts = srcText;
        let translatedText = '';
        destLang = translateEngineType === 'google_tran_api' ? allLanguage.google_tran_api.filter(item => item.code3.toUpperCase() === destLang.toUpperCase())[0].code
                 : translateEngineType === 'my_memory_api' ? allLanguage.my_memory_api.filter(item => item.code3.toUpperCase() === destLang.toUpperCase())[0].code
                 : translateEngineType === 'deepl_api' ? allLanguage.deepl_api.filter(item => item.code3.toUpperCase() === destLang.toUpperCase())[0].code
                 : ''
        srcLang = translateEngineType === 'google_tran_api' ? allLanguage.google_tran_api.filter(item => item.code3.toUpperCase() === srcLang.toUpperCase())[0].code
                : translateEngineType === 'my_memory_api' ? allLanguage.my_memory_api.filter(item => item.code3.toUpperCase() === srcLang.toUpperCase())[0].code
                : translateEngineType === 'deepl_api' ? allLanguage.deepl_api.filter(item => item.code3.toUpperCase() === srcLang.toUpperCase())[0].code
                : ''
        if (!texts) return '';
        if (!destLang || !srcLang) return;
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
              return translatedText;
            case 'RICH_TEXT':
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
              return texts;
            default:
          }
        } else {
          return;
        }
      },
  
      showLang: function (showLang) {
        $.each(G_translateFields, function (i, item) {
          $.each(item.target_fields, function (j, fieldEl) {
            if (window.BoK.eForm === undefined) {
              kintone.app.record.setFieldShown(fieldEl.field, fieldEl.iso.toUpperCase() === showLang.toUpperCase());
            } else {
              window.BoK.eForm.setFieldShow(fieldEl.field, fieldEl.iso.toUpperCase() === showLang.toUpperCase());
            }
          });
        });
      },
  
      trans: async function (destLang, srcLang, defCode, rows) {
        function checkSubtable(obj, prop) {
          for (const key in obj) {
              if (obj.hasOwnProperty(key)) {
                  const value = obj[key];
                  if (value.type === 'SUBTABLE') {
                      for (const entry of value.value) {
                          let entryValue = entry.value;
                          if (entryValue[prop]) return key;
                      }
                  }
              }
          }
          return false;
        }
        var record = kintone.app.record.get();
        if (!destLang || !srcLang) return;
        console.log('after2 src: ' + srcLang + '  Dest Leng: ' + destLang);
        if(Array.isArray(defCode)){
          for(const itemCode of defCode){
            let translateItem = G_translateFields.filter(item => item.item_code === itemCode)[0].target_fields;
            let destField = translateItem.filter(item => item.iso === destLang)[0].field;
            let srcField = translateItem.filter(item => item.iso === srcLang)[0].field;
            let subTable = checkSubtable(record.record, destField)
            let subTableData = record.record[subTable].value;
            if(!Array.isArray(rows)){
              let startIndex = rows === -1 ? 0 : rows;
              for(let i = startIndex; i < subTableData.length; i++) {
                let srcFieldText = subTableData[i].value[srcField].value;
                let srcFieldType = subTableData[i].value[srcField].type;
                let resTxt = await this.transText(destLang, srcFieldText, srcLang, srcFieldType);
                record.record[subTable].value[i].value[destField].value = resTxt;
              }
            }else{
              for(let i = 0; i < rows.length; i++) {
                let srcFieldText = subTableData[rows[i]].value[srcField].value;
                let srcFieldType = subTableData[rows[i]].value[srcField].type;
                let resTxt = await this.transText(destLang, srcFieldText, srcLang, srcFieldType);
                record.record[subTable].value[rows[i]].value[destField].value = resTxt;
              }
            }
          }
        }else{
          let translateItem = G_translateFields.filter(item => item.item_code === defCode)[0].target_fields;
          let destField = translateItem.filter(item => item.iso === destLang)[0].field;
          let srcField = translateItem.filter(item => item.iso === srcLang)[0].field;
          let subTable = checkSubtable(record.record, destField)
          let subTableData = record.record[subTable].value;
          if(!Array.isArray(rows)){
            let startIndex = rows === -1 ? 0 : rows;
            for(let i = startIndex; i < subTableData.length; i++) {
              let srcFieldText = subTableData[i].value[srcField].value;
              let srcFieldType = subTableData[i].value[srcField].type;
              let resTxt = await this.transText(destLang, srcFieldText, srcLang, srcFieldType);
              record.record[subTable].value[i].value[destField].value = resTxt;
            }
          }else{
            for(let i = 0; i < rows.length; i++) {
              let srcFieldText = subTableData[rows[i]].value[srcField].value;
              let srcFieldType = subTableData[rows[i]].value[srcField].type;
              let resTxt = await this.transText(destLang, srcFieldText, srcLang, srcFieldType);
              record.record[subTable].value[rows[i]].value[destField].value = resTxt;
            }
          }
        }
        kintone.app.record.set(record);
      },
  
      googleTrans: async function (srcText, srcLang, destLang) {
        try {
          let url = translateEngineURL;
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
          let url = translateEngineURL;
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
          let url = translateEngineURL;
          let apiKey = '';
          if (!url) return alert('Translate engine url not setting in config');
          // let url = apiUrl || 'https://api.mymemory.translated.net';
          let trans = await axios({ method: 'POST', url: `${url}/get?q=${srcText}&langpair=${srcLang}|${destLang}`, headers: { 'Authorization': `DeepL-Auth-Key ${apiKey}` } })
  
          if (trans.status === 200) {
            let txt = trans.data.responseData.translations[0].text;
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
          // return 'Translation request failed';
        }
      }
    }
    window.BoK.eAutoTrans = BoK;
  })(jQuery, kintone.$PLUGIN_ID);