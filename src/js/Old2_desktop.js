jQuery.noConflict();

(function ($, Swal10, PLUGIN_ID) {
    'use strict';
    const G_config = kintone.plugin.app.getConfig(PLUGIN_ID);
    let isoDEF = window.BoK.eAutoTrans.showLang();
    let G_translateFields = JSON.parse(G_config.translate_fields);
    let G_languageList = JSON.parse(G_config.language_list);

    kintone.events.on(['app.record.detail.show', 'app.record.create.show'], function (event) {
        try {
            $.each(G_translateFields, function (i, item) {
                $.each(item.target_fields, function (j, fieldEl) {
                    if (fieldEl.iso.toUpperCase() !== isoDEF) {
                        if (window.BoK.eForm === undefined) {
                            kintone.app.record.setFieldShown(fieldEl.field, false);
                        } else {
                            window.BoK.eForm.setFieldShow(fieldEl.field, false);
                        }
                    }
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

    //todo funtion for get object by value in object properties
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

    //todo check subtable
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

    //todo edit screen
    kintone.events.on('app.record.edit.show', async function (event) {
        try {
            const record = event.record;                    //get record from event
            const srcLang = G_languageList.filter(item => item.iso === isoDEF)[0].lang_code //get defult language code from G_config
            const schemaPage = cybozu.data.page.SCHEMA_DATA;//get object element in cybozu.data.page
            const translateDirection = G_config.translate_direction; //get translate direction from G_config

            let spaceId = [];
            for await (let items of G_translateFields) {
                let item = items;
                let spaceEl = item.space_element;
                let bt = kintone.app.record.getSpaceElement(spaceEl);

                for (let j = 0; j < item.target_fields.length; j++) {
                    let fieldEl = item.target_fields[j];
                    if (!fieldEl.field) continue;
                    let data = getObjectByVar(schemaPage, fieldEl.field);
                    let selectedField = fieldEl.field;

                    let el = '';
                    el = `.field-${data.id}`;

                    //todo check and hide fields
                    $.each(G_translateFields, function (i, item) {
                        $.each(item.target_fields, function (j, fieldEl) {
                            if (fieldEl.iso.toUpperCase() !== isoDEF.toUpperCase()) {
                                if (window.BoK.eForm === undefined) {
                                    kintone.app.record.setFieldShown(fieldEl.field, false);
                                } else {
                                    window.BoK.eForm.setFieldShow(fieldEl.field, false);
                                }
                            }
                        });
                    });
                    //check no habve spaceElement
                    // let spaceEl = G_config.translate_fields.filter(item => item.space_element === '');
                    // let hoverField = [];
                    // spaceEl.forEach(item => {
                    //     item.target_fields.forEach(items => {
                    //         hoverField.push(items.field);
                    //     })
                    // });
                    const hoverField = G_config.translate_fields.filter(item => item.space_element === '').flatMap(item => item.target_fields.map(items => items.field));

                    if (hoverField.includes(selectedField)) {

                        //todo Add event hover over
                        $(document).on('mouseover', el, async function (e) {
                            let timeout = setTimeout(async () => {
                                e.preventDefault();
                                //Check css in the class
                                // $('[style="box-sizing: border-box; width: 301px; height: auto; border: 1px solid rgb(227, 231, 232);"]').removeAttr('style');

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
                                //create right-click option and event handler
                                for (let k = 0; k < G_languageList.length; k++) {
                                    let langCode3 = G_languageList[k].iso.toUpperCase();
                                    if (langCode3 !== isoDEF.toUpperCase()) {
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
                                            let targetCode = item.target_fields[k].iso;
                                            const destLang = G_languageList.filter(item => item.iso === targetCode)[0].lang_code   //filter for get lang code2 in config for use in api 
                                            let fieldType = findPropertyById(record, srcField).type //get field type from record by src field
                                            let subtable = checkSubtable(record, data.var);
                                            let dataSubTable = record.Table.value || '';
                                            await setTranslate(event, fieldType, destLang, srcLang, subtable, dataSubTable, srcField, targetField);


                                        })
                                    } else {
                                        continue;
                                    }
                                }
                                $('body').append(customContextMenu);

                                //funtion for check target element and remove
                                function handleDocumentClick(event) {
                                    if (!customContextMenu.is(event.currentTarget) && customContextMenu.has(event.currentTarget).length === 0) {
                                        customContextMenu.remove();
                                        inputBorder.css('border', 'none');
                                        $(document).off('click', handleDocumentClick);
                                    }
                                }
                                $(document).on('click', handleDocumentClick);

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
                for (let i = 0; i < G_languageList.length; i++) {
                    let fieldLangCode = G_languageList[i].iso.toUpperCase();
                    if (fieldLangCode !== isoDEF.toUpperCase()) {
                        const btn = new Kuc.Button({
                            text: G_languageList[i].button_label,
                            type: 'normal',
                            id: item.space_element
                        });
                        bt.appendChild(btn);
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
                            let targetCode = G_languageList.filter(item => item.button_label === e.target.text)[0].iso; //get code from target element text
                            const destLang = G_languageList.filter(item => item.iso === targetCode)[0].lang_code   //filter for get lang code2 in config for use in api 
                            let srcField = filteredItems[i].target_fields.filter(item => item.iso.toUpperCase() === isoDEF.toUpperCase())[0].field; //get fieldcode from filteredItem
                            let targetField = filteredItems[i].target_fields.filter(item => item.iso.toUpperCase() === targetCode.toUpperCase())[0].field;
                            let fieldType = findPropertyById(record, srcField).type;
                            await setTranslate(event, fieldType, destLang, srcLang, false, '', srcField, targetField);
                        }
                    });
                })
            })
            //todo create a function translation 
            async function setTranslate(event, fieldType, destLang, srcLang, isSubTable, dataSubTable, srcField, targetField) {
                let resText = '';
                if (isSubTable !== false) {
                    let tableValue = dataSubTable;
                    for (let i = 0; i < tableValue.length; i++) {
                        switch (translateDirection) {
                            case 'from':
                                for (let i = 0; i < tableValue.length; i++) {
                                    if (srcField) {
                                        resText = await window.BoK.eAutoTrans.transText(srcLang, tableValue[i].value[targetField].value || '', destLang, fieldType);
                                        kintone.app.record.set(event, tableValue[i].value[srcField].value = resText);
                                    }
                                }
                                break;
                            case 'to':
                                for (let i = 0; i < tableValue.length; i++) {
                                    if (targetField) {
                                        resText = await window.BoK.eAutoTrans.transText(destLang, tableValue[i].value[srcField].value || '', srcLang, fieldType);
                                        kintone.app.record.set(event, tableValue[i].value[targetField].value = resText);
                                    }
                                }
                                break;
                            default:
                        }
                    }
                } else {
                    switch (translateDirection) {
                        case 'from':
                            if (srcField) {
                                resText = await window.BoK.eAutoTrans.transText(srcLang, record[targetField].value || '', destLang, fieldType);
                                kintone.app.record.set(event, record[srcField].value = resText);
                            }
                            break;
                        case 'to':
                            if (targetField) {
                                resText = await window.BoK.eAutoTrans.transText(destLang, record[srcField].value || '', srcLang, fieldType);
                                kintone.app.record.set(event, record[targetField].value = resText);
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