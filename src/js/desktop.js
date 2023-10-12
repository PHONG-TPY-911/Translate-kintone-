jQuery.noConflict();

(function ($, Swal10, PLUGIN_ID) {
    'use strict';
    const G_config = kintone.plugin.app.getConfig(PLUGIN_ID);
    if (!G_config) return;  // check G_config no have value
    let G_translateFields = JSON.parse(G_config.translate_fields);
    let G_languageList = JSON.parse(G_config.language_list);
    let G_isoDEF = (G_config.default_language ? G_config.default_language : G_languageList[0].iso) || ''; // check no have value || have value || return
    if (!G_isoDEF) return;


    kintone.events.on('app.record.detail.show', function () {
        try {
            window.BoK.eAutoTrans.showLang(G_isoDEF);
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
    //todo funtion for get object by value in object properties
    function getFieldData(data, fieldCode) {
        // Search in fieldList
        for (const key in data.table.fieldList) {
            if (data.table.fieldList[key].var === fieldCode) {
                return data.table.fieldList[key];
            }
        }
        // Search in subTable
        for (const subKey in data.subTable) {
            for (const key in data.subTable[subKey].fieldList) {
                if (data.subTable[subKey].fieldList[key].var === fieldCode) {
                    return data.subTable[subKey].fieldList[key];
                }
            }
        }
        return null; // Return null if not found
    }
    //todo check subtable
    function checkSubtable(obj, prop) {
        for (const key in obj) {
            const value = obj[key];
            if (value.type === 'SUBTABLE') {
                for (const entry of value.value) {
                    let entryValue = entry.value;
                    if (entryValue.hasOwnProperty(prop)) return key;
                }
            }
        }
        return false;
    }
    //todo edit screen
    kintone.events.on(['app.record.edit.show', 'app.record.create.show'], async function (event) {
        try {
            const record = event.record;//get record from event
            const srcLang = G_isoDEF //get defult language code from G_config
            const schemaPage = cybozu.data.page.SCHEMA_DATA;//get object element in cybozu.data.page
            const translateDirection = G_config.translate_direction;//get translate direction from G_config

            let spaceId = [];
            for await (let items of G_translateFields) {
                let spaceEl = items.space_element;
                let spaceElement = kintone.app.record.getSpaceElement(spaceEl);

                for (let j = 0; j < items.target_fields.length; j++) {
                    let fieldEl = items.target_fields[j];
                    if (!fieldEl.field) continue;
                    let data = getFieldData(schemaPage, fieldEl.field);
                    if (!data) continue;
                    let selectedField = fieldEl.field;

                    // let fieldElement = '';
                    // fieldElement = `.field-${data.id}`;
                    let fieldSelector = `.field-${data.id}`;

                    //todo check and hide fields
                    window.BoK.eAutoTrans.showLang(G_isoDEF);

                    //todo check no have spaceElement
                    const hoverField = G_translateFields.filter(item => item.space_element === '').flatMap(item => item.target_fields.map(items => items.field));
                    //todo Add event hover
                    if (hoverField.includes(selectedField)) {
                        //todo Add event hover over
                        $(document).on('mouseover', fieldSelector, async function (e) {
                            $(e.currentTarget).css({
                                border: '1px solid red'
                            });
                            let timeout = setTimeout(async () => {
                                e.preventDefault();
                                const oldContextMenu = $('#custom-context-menu');
                                let inputBorder = $(e.currentTarget);
                                $(e.currentTarget).css({
                                    border: '1px solid red'
                                });
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
                                //create Hover option and event handler
                                for (let k = 0; k < G_languageList.length; k++) {
                                    let langCode3 = G_languageList[k].iso.toUpperCase();
                                    if (langCode3 !== G_isoDEF.toUpperCase()) {
                                        let targetField = item.target_fields[k].field;
                                        let srcField = data.var;
                                        const hoverBtn = new Kuc.Button({
                                            text: `${G_languageList[k].button_label}`,
                                            type: 'normal',
                                            id: targetField
                                        });
                                        customContextMenu.append(hoverBtn);
                                        //todo add event handler to button
                                        hoverBtn.addEventListener('click', async (e) => {
                                            const destLang = item.target_fields[k].iso;   //filter for get lang code2 in config for use in api 
                                            let fieldType = findPropertyById(record, srcField).type //get field type from record by src field
                                            let subtable = checkSubtable(record, data.var);
                                            await setTranslate(fieldType, destLang, srcLang, subtable, srcField, targetField);
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
                if (!spaceElement || spaceElement.innerHTML) continue;
                for (let i = 0; i < G_languageList.length; i++) {
                    let fieldLangCode = G_languageList[i].iso.toUpperCase();
                    if (fieldLangCode !== G_isoDEF.toUpperCase()) {
                        const btn = new Kuc.Button({
                            text: G_languageList[i].button_label,
                            type: 'normal',
                            id: item.space_element
                        });
                        spaceElement.appendChild(btn);
                    } else {
                        continue;
                    }
                }
                spaceId.push(item.space_element);
            }
            //todo add event to button in space element
            $.each(spaceId, function (index, space) {
                document.querySelectorAll(`#${space}`).forEach(function (item) {
                    item.addEventListener('click', async function (e) {
                        const filteredItems = G_translateFields.filter(item => item.space_element === space); //filter object that have space_element = space
                        for (let i = 0; i < filteredItems.length; i++) {
                            const destLang = G_languageList.filter(item => item.button_label === e.target.text)[0].iso;   //filter for get lang code2 in config for use in api
                            let srcField = filteredItems[i].target_fields.filter(item => item.iso.toUpperCase() === G_isoDEF.toUpperCase())[0].field; //get fieldcode from filteredItem
                            let targetField = filteredItems[i].target_fields.filter(item => item.iso.toUpperCase() === destLang.toUpperCase())[0].field;
                            let fieldType = findPropertyById(record, srcField).type;
                            await setTranslate(fieldType, destLang, srcLang, false, srcField, targetField);
                        }
                    });
                })
            })
            //todo create a function translation 
            async function setTranslate(fieldType, destLang, srcLang, isSubTable, srcField, targetField) {
                let resp = kintone.app.record.get();
                let resText = '';
                if (isSubTable !== false) {
                    let tableCode = isSubTable;
                    let tableValue = resp.record[tableCode].value;
                    for (let i = 0; i < tableValue.length; i++) {
                        switch (translateDirection) {
                            case 'from':
                                // for (let i = 0; i < tableValue.length; i++) { // add this must translate only the mouse over row
                                    if (srcField) {
                                        resText = await window.BoK.eAutoTrans.transText(srcLang, tableValue[i].value[targetField].value || '', destLang, fieldType);
                                        kintone.app.record.set(event, tableValue[i].value[srcField].value = resText);
                                        tableValue[i].value[srcField].value = resText;
                                        kintone.app.record.set(resp);
                                    }
                                // }
                                break;
                            case 'to':
                                // for (let i = 0; i < tableValue.length; i++) {
                                    if (targetField) {
                                        resText = await window.BoK.eAutoTrans.transText(destLang, tableValue[i].value[srcField].value || '', srcLang, fieldType);
                                        tableValue[i].value[targetField].value = resText;
                                        kintone.app.record.set(resp);
                                    }
                                // }
                                break;
                            default:
                        }
                    }
                } else {
                    switch (translateDirection) {
                        case 'from':
                            if (srcField) {
                                resText = await window.BoK.eAutoTrans.transText(srcLang, resp.record[targetField].value || '', destLang, fieldType);
                                resp.record[srcField].value = resText
                                kintone.app.record.set(resp);
                            }
                            break;
                        case 'to':
                            if (targetField) {
                                resText = await window.BoK.eAutoTrans.transText(destLang, resp.record[srcField].value || '', srcLang, fieldType);
                                resp.record[targetField].value = resText
                                kintone.app.record.set(resp);
                            }
                            break;
                        default:
                    }
                }
            }
            return event;
        } catch (error) {
            return console.log('Error', error.message || error, 'error');
        }
    });


})(jQuery, Sweetalert2_10.noConflict(true), kintone.$PLUGIN_ID);