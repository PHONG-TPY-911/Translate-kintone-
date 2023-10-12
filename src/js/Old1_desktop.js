// const Kuc = Kucs['1.x.x'];

let G_config = {
    display_language: {
        lang_code: "en",
        iso: "ENG"
    },
    language_list: [
        {
            language: "english",
            lang_code: "en",
            iso: "ENG"
        },
        {
            language: "japanese",
            lang_code: "ja",
            iso: "JPN"
        },
        {
            language: "lao",
            lang_code: "lo",
            iso: "LAO"
        }
    ],
    translate_fields: [
        {
            item_code: "item1",
            space_element: "spaceElement",
            target_fields: [
                { iso: "ENG", field: "PRODUCTDES_ENG" },
                { iso: "JPN", field: "PRODUCTDES_JPN" },
                { iso: "LAO", field: "PRODUCTDES_LAO" }
            ]
        },
        {
            item_code: "item2",
            space_element: "",
            target_fields: [
                { iso: "ENG", field: "PRODUCTDES_0_ENG" },
                { iso: "JPN", field: "PRODUCTDES_0_JPN" },
                { iso: "LAO", field: "PRODUCTDES_0_LAO" }
            ]
        },
        {
            item_code: "item3",
            space_element: "",
            target_fields: [
                { iso: "ENG", field: "Rich_text_ENG" },
                { iso: "JPN", field: "Rich_text_JPN" },
                { iso: "LAO", field: "Rich_text_LAO" }
            ]
        },
        {
            item_code: "item4",
            space_element: "",
            target_fields: [
                { iso: "ENG", field: "Text_area_ENG" },
                { iso: "JPN", field: "Text_area_JPN" },
                { iso: "LAO", field: "Text_area_LAO" }
            ]
        },
    ],
    translate_direction: "from", // from || to
    translate_engine: {
        type: 'gg',
        url: 'https://translate.googleapis.com/translate_a',
        token: '',
        apiKey: ''
    }
}

kintone.events.on(['app.record.detail.show', 'app.record.create.show'], function (event) {
    try {
        const items = G_config.translate_fields;
        $.each(items, function (i, item) {
            $.each(item.target_fields, function (j, fieldEl) {
                if (fieldEl.iso.toUpperCase() !== G_config.display_language.iso) kintone.app.record.setFieldShown(fieldEl.field, false);
            });
        });
    } catch (error) {
        return console.log('Error', error.message || error, 'error');
    }
});

function findPropertyById(obj, targetId) {
    //search target id
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (key === targetId) {
                return obj[key];
            } else if (typeof obj[key] === 'object') {
                const result = findPropertyById(obj[key], targetId);
                if (result !== undefined) {
                    return result;
                }
            }
        }
    }
}
function getObjectByVar(data, targetVar) {
    // Search in fieldList
    for (const key in data.table.fieldList) {
        if (data.table.fieldList[key].var === targetVar) {
            return data.table.fieldList[key];
        }
    }
    // Search in subTable
    for (const subKey in data.subTable) {
        if (data.subTable.hasOwnProperty(subKey)) {
            for (const key in data.subTable[subKey].fieldList) {
                if (data.subTable[subKey].fieldList.hasOwnProperty(key)) {
                    if (data.subTable[subKey].fieldList[key].var === targetVar) {
                        return data.subTable[subKey].fieldList[key];
                    }
                }
            }
        }
    }
    return null; // Return null if not found
}

//todo check table field
async function tableFieldCheck(data, targetVar) {
    for await (const subTable of Object.values(data.subTable)) {
        const fieldList = subTable.fieldList;
        if (fieldList.hasOwnProperty(targetVar)) {
            return true;
        }
        for (const item of Object.values(fieldList)) {
            if (item.var === targetVar) {
                return true;
            }
        }
    }
    return false;
}

//Check engine api
let checkEngine = G_config.translate_engine.type //get type engine to translated from config
let apiUrl = G_config.translate_engine.url;//get url to translate from config
let apiKey = G_config.translate_engine.apiKey //get apikey to translate from config
// Function to translate the text
async function translateText(text, srcLang, targetLang) {
    let engine = checkEngine;
    let txt = ''
    if (engine === 'gg') {
        txt = await window.BoK.eAutoTrans.googleTrans(text, srcLang, targetLang, apiUrl);
    }
    if (engine === 'mmo') {
        txt = await window.BoK.eAutoTrans.myMemoryTrans(text, srcLang, targetLang, apiUrl);
    }
    if (engine === 'dl') {
        txt = await window.BoK.eAutoTrans.myMemoryTrans(text, srcLang, targetLang, apiUrl, apiKey);
        // console.log('no Deep')
    }
    return txt;
}

function findTextProperty(obj, prop) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            // console.log('value',value);
            if (value.type === 'SUBTABLE') {
                console.log("table", value);
                console.log("key", key);
                for (const entry of value.value) {
                    console.log('entry', entry.value);
                    let entryValue = entry.value;
                    if (entryValue[prop]) return key;
                }
            }
        }
    }
    return false;
}

kintone.events.on(['app.record.edit.show', 'app.record.create.show'], async function (event) {
    try {
        const record = event.record;                    //get record from event
        const itemsG = G_config.translate_fields;             //get items group from G_config
        const langList = G_config.language_list;        //get language list from G_config
        const defLang = G_config.display_language.iso;      //get display_language from G_config
        const defLangCode = G_config.display_language.lang_code; //get defult language code from G_config
        const schemaPage = cybozu.data.page.SCHEMA_DATA;//get object element in cybozu.data.page
        const translateDirection = G_config.translate_direction; //get translate direction from G_config
        console.log(cybozu.data.page);

        let spaceId = [];
        for await (let items of itemsG) {
            let item = items;
            console.log(":::", item);
            let spaceEl = items.space_element;
            let bt = kintone.app.record.getSpaceElement(spaceEl);

            for (let j = 0; j < item.target_fields.length; j++) {
                let fieldEl = item.target_fields[j];
                if (!fieldEl.field) continue;
                let data = getObjectByVar(schemaPage, fieldEl.field);
                let selectedField = fieldEl.field;
                console.log('selectedField',selectedField);
                let el = '';
                el = `.field-${data.id}`;
                // if (data.type === "SINGLE_LINE_TEXT") {
                //     el = `field-${data.id}`;
                // }
                // if (data.type === "MULTIPLE_LINE_TEXT") {
                //     el = `textarea[id*="${data.id}"]`;
                // }
                // if (data.type === "EDITOR") {
                //     el = `div[id*="${data.id}"].editor-cybozu`;
                // }
                //todo check and hide fields
                // if (fieldEl.iso.toUpperCase() !== defLang) {
                //     kintone.app.record.setFieldShown(fieldEl.field, false);
                // }
                // let spaceE = G_config.translate_fields.filter(item => item.space_element === '');
                // console.log('002', spaceE);

                // let hoverField = []
                // spaceE.forEach(item => {
                //     console.log('11111', item);
                //     item.target_fields.forEach(atem => {
                //         console.log('2222', atem);
                //         hoverField.push(atem.field)
                //     })
                // })
                const hoverField = G_config.translate_fields.filter(item => item.space_element === '').flatMap(item => item.target_fields.map(items => items.field));
                console.log('200', hoverField);

                if (hoverField.includes(selectedField)) {
                    //     console.log('12131');
                    //todo Add event hover over
                    $(document).on('mouseover', el, async function (e) {
                        let inputBorder = '';
                        inputBorder = $(e.currentTarget);
                        $(e.currentTarget).css({
                            border: '1px solid red'
                        });
                        let timeout = setTimeout(async () => {
                            e.preventDefault();
                            //Check css in the class
                            // $('[style="box-sizing: border-box; width: 301px; height: auto; border: 1px solid rgb(227, 231, 232);"]').removeAttr('style');
                            const oldContextMenu = $('#custom-context-menu');
                            // let inputBorder = $(e.currentTarget);
                            // $(e.currentTarget).css({
                            //     border: '1px solid red'
                            // });
                            //check old contextmenu and remove
                            if (oldContextMenu.length) {
                                oldContextMenu.remove();
                            }
                            //create contextmenu
                            var customContextMenu = $('<div>').attr('id', 'custom-context-menu')
                                .css({
                                    position: 'absolute',
                                    background: '#fff',
                                    border: '1px solid #ccc',
                                    boxShadow: '2px 2px 5px rgba(0, 0, 0, 0.1)',
                                    padding: '5px',
                                    left: e.pageX + 'px',
                                    top: e.pageY + 'px'
                                });

                            //create hover over option and event handler
                            for (let k = 0; k < langList.length; k++) {
                                let langCode3 = langList[k].iso.toUpperCase();
                                if (langCode3 !== defLang.toUpperCase()) {
                                    console.log(item.target_fields[k]);
                                    let targetField = item.target_fields[k].field;
                                    console.log('003', targetField);
                                    let srcField = data.var;
                                    const hoverBtn = new Kuc.Button({
                                        text: `${langCode3}`,
                                        type: 'normal',
                                        id: targetField
                                    });
                                    customContextMenu.append(hoverBtn);
                                    //todo add event handler to button
                                    hoverBtn.addEventListener('click', async (e) => {
                                        let targetCode = e.target.text; //get code from target element text
                                        const codeForTran = G_config.language_list.filter(item => item.iso === targetCode)[0].lang_code   //filter for get lang code2 in config for use in api 
                                        let fieldType = findPropertyById(record, srcField).type //get field type from record by src field
                                        console.log('001', codeForTran);
                                        console.log('003', targetField);
                                        console.log(data.var);
                                        console.log('004', fieldType);
                                        let subtable = findTextProperty(record, data.var);
                                        console.log('subtabe', subtable);
                                        let dataSubTable = record.Table.value || '';
                                        console.log('dataSubTable', dataSubTable);
                                        await setTranslate(event, fieldType, codeForTran, defLangCode, subtable, dataSubTable, srcField, targetField);

                                        // customContextMenu.remove();
                                        // inputBorder;
                                    })
                                } else {
                                    continue;
                                }
                            }
                            $('body').append(customContextMenu);
                            //funtion for check target element and remove
                            // function handleDocumentClick(event) {
                            //     if (!customContextMenu.is(event.currentTarget) && customContextMenu.has(event.currentTarget).length === 0) {
                            //         customContextMenu.remove();
                            //         inputBorder.css('border', 'none');
                            //         $(document).off('click', handleDocumentClick);
                            //     }
                            // }
                            // $(document).on('click', handleDocumentClick);

                            // Add a mouseleave event handler to the button
                            inputBorder.on('mouseover', function () {
                                inputBorder.css('border', 'none');
                                customContextMenu.remove();
                            });
                        }, 1000);
                        //check mouseout
                        $(this).on('mouseout', function () {
                            clearTimeout(timeout);
                        });
                    });
                } else {
                    continue;
                }
            }

            //todo create button to space
            if (!bt || bt.innerHTML) continue;
            for (let i = 0; i < langList.length; i++) {
                let fieldLangCode = langList[i].iso.toUpperCase();
                if (fieldLangCode !== defLang) {
                    console.log('lang_code', fieldLangCode);
                    const btn = new Kuc.Button({
                        text: fieldLangCode,
                        type: 'normal',
                        id: item.space_element
                    });

                    bt.appendChild(btn);
                    console.log('btn', btn);
                } else {
                    continue;
                }
            }
            spaceId.push(item.space_element);
        }
        console.log(spaceId);
        //todo add event to button in space element
        $.each(spaceId, function (index, space) {
            console.log(document.querySelectorAll(`#${space}`));
            document.querySelectorAll(`#${space}`).forEach(function (item) {
                item.addEventListener('click', async function (e) {
                    // field = 'text_table_gg';
                    // console.log(await tableFieldCheck(schemaPage, field));
                    console.log(e.target);
                    const filteredItems = G_config.translate_fields.filter(item => item.space_element === space); //filter object that have space_element = space
                    console.log(filteredItems);

                    for (let i = 0; i < filteredItems.length; i++) {
                        let targetCode = e.target.text; //get code from target element text
                        console.log('tttttttttttttttttt' + targetCode);
                        const codeForTran = G_config.language_list.filter(item => item.iso === targetCode)[0].lang_code   //filter for get lang code2 in config for use in api 
                        console.log(i, codeForTran);
                        let srcField = filteredItems[i].target_fields.filter(item => item.iso.toUpperCase() === defLang)[0].field; //get fieldcode from filteredItem
                        let targetField = filteredItems[i].target_fields.filter(item => item.iso.toUpperCase() === targetCode)[0].field;
                        let fieldType = findPropertyById(record, srcField).type
                        // console.log('srcField', record[srcField].value);
                        // console.log('targetField', record[targetField].value);
                        console.log('srcField', srcField);
                        console.log('targetField', targetField);
                        console.log(findPropertyById(record, srcField));
                        await setTranslate(event, fieldType, codeForTran, defLangCode, false, '', srcField, targetField);
                    }
                });
            })
        })

        //todo create a function translation 
        async function setTranslate(event, fieldType, codeForTran, defLangCode, isSubTable, dataSubTable, srcField, targetField) {
            console.log(kintone.app.record.get());
            let resp = kintone.app.record.get();
            let texts = '';
            let txt = '';
            if (isSubTable !== false) {
                console.log(isSubTable);
                console.log(fieldType);
                let tableValue = dataSubTable;
                console.log(tableValue);
                if (fieldType === 'MULTI_LINE_TEXT') {
                    switch (translateDirection) {
                        case 'from':
                            for (let i = 0; i < tableValue.length; i++) {
                                texts = tableValue[i].value[targetField].value.split('\n')
                                for await (let item of texts) {
                                    if (!item) continue;
                                    console.log('mrtghjknhrt')
                                    txt += `${await translateText(item, codeForTran, defLangCode)}\n`;
                                }
                                kintone.app.record.set(event, tableValue[i].value[srcField].value = txt);
                            }
                            break;
                        case 'to':
                            for (let i = 0; i < tableValue.length; i++) {
                                texts = tableValue[i].value[srcField].value.split('\n')
                                for await (let item of texts) {
                                    if (!item) continue;
                                    console.log('mrtghjknhrt')
                                    txt += `${await translateText(item, defLangCode, codeForTran)}\n`;
                                }
                                kintone.app.record.set(event, tableValue[i].value[targetField].value = txt);
                            }
                            break;
                        default:
                    }
                    console.log(texts)
                    console.log(txt);
                } else if (fieldType === 'RICH_TEXT') {
                    // Create a new DOMParser
                    const parser = new DOMParser();
                    let doc = '';
                    let elements = '';
                    switch (translateDirection) {   //translate text type RICH_TEXT 
                        case 'from':
                            for (let i = 0; i < tableValue.length; i++) {
                                texts = tableValue[i].value[targetField].value;
                                console.log('richTextVar::', texts);
                                // Parse the HTML string
                                doc = parser.parseFromString(texts, 'text/html');
                                elements = doc.body.firstChild.childNodes;  //get all element nodes
                                console.log('doc', doc.body.firstChild.childNodes);
                                //loop for get text in div only
                                txt = [];
                                elements.forEach(node => {
                                    txt.push(node.textContent);
                                })
                                console.log(txt);
                                // if (txt.length <= 0) return kintone.app.record.set(event, record[srcField].value = '');
                                //translate text and replace it to old values
                                for await (const item of txt) {
                                    if (item == '' || /^\s+$/.test(item)) {
                                        texts = texts.replace(`${item}`, `${item}`)
                                    } else {
                                        texts = texts.replace(`${item}`, await translateText(item, codeForTran, defLangCode))
                                    }
                                }
                                console.log(texts);
                                kintone.app.record.set(event, tableValue[i].value[srcField].value = texts);
                            }
                            break;
                        case 'to':
                            for (let i = 0; i < tableValue.length; i++) {
                                texts = tableValue[i].value[srcField].value;
                                // Parse the HTML string
                                doc = parser.parseFromString(texts, 'text/html');
                                elements = doc.body.firstChild.childNodes;  //get all element nodes
                                console.log('doc', doc.body.firstChild.childNodes);
                                //loop for get text in div only
                                txt = [];
                                elements.forEach(node => {
                                    txt.push(node.textContent);
                                })
                                console.log(txt);
                                //translate text and replace it to old values
                                for await (const item of txt) {
                                    texts = texts.replace(`${item}`, await translateText(item, defLangCode, codeForTran))
                                }
                                console.log(texts);
                                kintone.app.record.set(event, tableValue[i].value[targetField].value = texts);
                            }
                            break;
                        default:
                    }
                } else if (fieldType === 'SINGLE_LINE_TEXT') {
                    switch (translateDirection) {   //translate text type SINGLE_LINE_TEXT 
                        case 'from':
                            for (let i = 0; i < tableValue.length; i++) {
                                texts = tableValue[i].value[targetField].value;
                                if (!texts) continue;
                                txt = await translateText(texts, codeForTran, defLangCode);
                                kintone.app.record.set(event, tableValue[i].value[srcField].value = txt);
                            }
                            break;
                        case 'to':
                            for (let i = 0; i < tableValue.length; i++) {
                                texts = tableValue[i].value[srcField].value;
                                if (!texts) continue;
                                txt = await translateText(texts, defLangCode, codeForTran);
                                kintone.app.record.set(event, tableValue[i].value[targetField].value = txt);
                            }
                            break;
                        default:
                    }
                }
            } else {
                if (fieldType === 'MULTI_LINE_TEXT') {
                    switch (translateDirection) {
                        case 'from':
                            texts = record[targetField].value.split('\n')
                            for await (let item of texts) {
                                if (!item) continue;
                                console.log('mrtghjknhrt')
                                txt += `${await translateText(item, codeForTran, defLangCode)}\n`;
                            }
                            kintone.app.record.set(event, record[srcField].value = txt);
                            break;
                        case 'to':
                            texts = record[srcField].value.split('\n')
                            for await (let item of texts) {
                                if (!item) continue;
                                console.log('mrtghjknhrt')
                                txt += `${await translateText(item, defLangCode, codeForTran)}\n`;
                            }
                            kintone.app.record.set(event, record[targetField].value = txt);
                            break;
                        default:
                    }
                    console.log(texts)
                    console.log(txt);
                } else if (fieldType === 'RICH_TEXT') {
                    // Create a new DOMParser
                    const parser = new DOMParser();
                    let doc = '';
                    let elements = '';
                    switch (translateDirection) {   //translate text type RICH_TEXT 
                        case 'from':
                            texts = record[targetField].value;
                            console.log('richTextVar::', texts);
                            // Parse the HTML string
                            doc = parser.parseFromString(texts, 'text/html');
                            elements = doc.body.firstChild.childNodes;  //get all element nodes
                            console.log('doc', doc.body.firstChild.childNodes);
                            //loop for get text in div only
                            txt = [];
                            elements.forEach(node => {
                                txt.push(node.textContent);
                            })
                            console.log(txt);
                            // if (txt.length <= 0) return kintone.app.record.set(event, record[srcField].value = '');
                            //translate text and replace it to old values
                            for await (const item of txt) {
                                if (item == '' || /^\s+$/.test(item)) {
                                    texts = texts.replace(`${item}`, `${item}`)
                                } else {
                                    texts = texts.replace(`${item}`, await translateText(item, codeForTran, defLangCode))
                                }
                            }
                            console.log(texts);
                            kintone.app.record.set(event, record[srcField].value = texts);
                            break;
                        case 'to':
                            texts = record[srcField].value;
                            // Parse the HTML string
                            doc = parser.parseFromString(texts, 'text/html');
                            elements = doc.body.firstChild.childNodes;  //get all element nodes
                            console.log('doc', doc.body.firstChild.childNodes);
                            //loop for get text in div only
                            txt = [];
                            elements.forEach(node => {
                                txt.push(node.textContent);
                            })
                            console.log(txt);
                            //translate text and replace it to old values
                            for await (const item of txt) {
                                texts = texts.replace(`${item}`, await translateText(item, defLangCode, codeForTran))
                            }
                            console.log(texts);
                            kintone.app.record.set(event, record[targetField].value = texts);
                            break;
                        default:
                    }
                } else if (fieldType === 'SINGLE_LINE_TEXT') {
                    switch (translateDirection) {   //translate text type SINGLE_LINE_TEXT 
                        case 'from':
                            texts = record[targetField].value;
                            if (!texts) return console.log('is null value');
                            txt = await translateText(texts, codeForTran, defLangCode);
                            kintone.app.record.set(event, record[srcField].value = txt);
                            break;
                        case 'to':
                            texts = record[srcField].value;
                            if (!texts) return console.log('is null value');
                            txt = await translateText(texts, defLangCode, codeForTran);
                            kintone.app.record.set(event, record[targetField].value = txt);
                            break;
                        default:
                    }
                }
            }
        }
        // console.log(G_config);
        // console.log(event);
        // console.log('ghh\nsikuhgir\n');
    } catch (error) {
        return console.log('Error', error.message || error, 'error');
    }
});


