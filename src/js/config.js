jQuery.noConflict();

(function ($, PLUGIN_ID) {
  'use strict';


  // // todo check remove button
  // function checkRemoveButton() {
  //   if ($('#kintoneplugin-setting-tbody > tr').length === 2) {
  //     $('#kintoneplugin-setting-tbody > tr #minus')
  //   }
  // }
  


  // var $form = $('.js-submit-settings');
  // var $cancelButton = $('.js-cancel-button');
  // var $message = $('.js-text-message');
  // if (!($form.length > 0 && $cancelButton.length > 0 && $message.length > 0)) {
  //   throw new Error('Required elements do not exist.');
  // }
  // var config = kintone.plugin.app.getConfig(PLUGIN_ID);
  // console.log(config);

  // if (config.message) {
  //   $message.val(config.message);
  // }
  // $form.on('submit', function (e) {
  //   e.preventDefault();
  //   console.log("Element:::", e);
  //   kintone.plugin.app.setConfig({ message: $message.val() }, function () {
  //     alert('The plug-in settings have been saved. Please update the app!');
  //     window.location.href = '../../flow?app=' + kintone.app.getId();
  //   });
  // });
  // $cancelButton.on('click', function () {
  //   window.location.href = '../../' + kintone.app.getId() + '/plugin/';
  // });

  // let cfig = {
  //   display_language: 'en',
  //   language_list: ['ja','en','lo'],
  // }
  
})(jQuery, kintone.$PLUGIN_ID);
