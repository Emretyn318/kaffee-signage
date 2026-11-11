// Kaffee Schütz ekran uygulaması: oynatıcıyı tam ekran açar, takılırsa kendini toparlar.
(function () {
  var PLAYER = 'https://emretyn318.github.io/kaffee-signage/player/';
  var f = document.getElementById('f'), wait = document.getElementById('wait');
  var lastAlive = 0;

  function load() { f.src = PLAYER + '?t=' + Date.now(); }

  window.addEventListener('message', function (e) {
    if (e.data === 'sig-alive') { lastAlive = Date.now(); wait.style.display = 'none'; }
  });

  // 45 sn içinde oynatıcıdan ses gelmezse (açılamadıysa ya da donduysa) yeniden yükle
  setInterval(function () {
    if (Date.now() - lastAlive > 45000) { if (!lastAlive) wait.style.display = 'flex'; load(); }
  }, 45000);

  try { if (window.webapis && webapis.appcommon) webapis.appcommon.setScreenSaver(webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_OFF); } catch (e) {}
  document.addEventListener('keydown', function (e) { if (e.keyCode === 10009) e.preventDefault(); });
})();
