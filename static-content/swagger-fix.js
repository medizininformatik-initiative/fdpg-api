function fixSwagger() {
  const redirectHtmlPath = 'oauth2-redirect.html';
  const oauth2RedirectUrl = window.ui.getConfigs().oauth2RedirectUrl;
  if (!oauth2RedirectUrl.includes(redirectHtmlPath)) {
    console.log('Changing oauth2RedirectUrl...');
    loc = window.location;
    window.ui.getConfigs().oauth2RedirectUrl = `${loc.protocol}//${loc.host}/${oauth2RedirectUrl}/${redirectHtmlPath}`;
  }
  console.log('oauth2RedirectUrl: ', window.ui.getConfigs().oauth2RedirectUrl);
}

var count = 0;

var checkExist = setInterval(function () {
  if (window.ui) {
    clearInterval(checkExist);

    fixSwagger();
  } else {
    count++;
    console.log('No swagger ui found retry: ', count);

    if (count > 10) {
      clearInterval(checkExist);
    }
  }
}, 100);
