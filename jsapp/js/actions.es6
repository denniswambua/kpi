import {dataInterface} from './dataInterface';
import {
  log,
  t,
  notify,
  redirectTo,
} from './utils';

var Reflux = require('reflux');

var actions = {};


actions.navigation = Reflux.createActions([
    'transitionStart',
    'transitionEnd',
    'historyPush',
    'routeUpdate',

    'documentTitleUpdate'
  ]);

actions.auth = Reflux.createActions({
  login: {
    children: [
      'loggedin',
      'passwordfail',
      'anonymous',
      'failed'
    ]
  },
  verifyLogin: {
    children: [
      'loggedin',
      'anonymous',
      'failed'
    ]
  },
  logout: {
    children: [
      'completed',
      'failed'
    ]
  }
});

actions.survey = Reflux.createActions({
  addItemAtPosition: {
    children: [
      'completed',
      'failed'
    ],
  }
});

actions.search = Reflux.createActions({
  assets: {
    children: [
      'completed',
      'failed'
    ]
  },
  assetsWithTags: {
    children: [
      'completed',
      'failed'
    ]
  },
  tags: {
    children: [
      'completed',
      'failed'
    ]
  },
  libraryDefaultQuery: {
    children: [
      'completed',
      'failed'
    ]
  },
  collections: {
    children: [
      'completed',
      'failed'
    ]
  }
});

actions.resources = Reflux.createActions({
  listAssets: {
    children: [
      'completed',
      'failed'
    ]
  },
  listSurveys: {
    children: [
      'completed',
      'failed'
    ]
  },
  listCollections: {
    children: [
      'completed',
      'failed'
    ]
  },
  listQuestionsAndBlocks: {
    children: [
      'completed',
      'failed'
    ]
  },
  createAsset: {
    children: [
      'completed',
      'failed'
    ]
  },
  createImport: {
    children: [
      'completed',
      'failed'
    ]
  },
  loadAsset: {
    children: [
      'completed',
      'failed'
    ]
  },
  deployAsset: {
    children: [
      'completed',
      'failed'
    ]
  },
  createSnapshot: {
    children: [
      'completed',
      'failed'
    ]
  },
  cloneAsset: {
    children: [
      'completed',
      'failed'
    ]
  },
  deleteAsset: {
    children: [
      'completed',
      'failed'
    ]
  },
  listTags: {
    children: [
      'completed',
      'failed'
    ]
  },
  createCollection: {
    children: [
      'completed',
      'failed'
    ]
  },
  readCollection: {
    children: [
      'completed',
      'failed'
    ]
  },
  updateCollection: {
    children: [
      'completed',
      'failed'
    ]
  },
  deleteCollection: {
    children: [
      'completed',
      'failed'
    ]
  },
  loadAssetSubResource: {
    children: [
      'completed',
      'failed'
    ]
  },
  loadAssetContent: {
    children: [
      'completed',
      'failed'
    ]
  },
  loadResource: {
    children: [
      'completed',
      'failed'
    ],
  },
  createResource: {
    children: [
      'completed',
      'failed'
    ]
  },
  updateAsset: {
    children: [
      'completed',
      'failed'
    ]
  },
  notFound: {}
});

actions.permissions = Reflux.createActions({
  assignPerm: {
    children: [
      'completed',
      'failed'
    ]
  },
  removePerm: {
    children: [
      'completed',
      'failed'
    ]
  },
  assignPublicPerm: {
    children: [
      'completed',
      'failed'
    ]
  }
});

actions.misc = Reflux.createActions({
  checkUsername: {
    asyncResult: true,
    children: [
      'completed',
      'failed_'
    ]
  }
});


actions.misc.checkUsername.listen(function(username){
  dataInterface.queryUserExistence(username)
    .then(actions.misc.checkUsername.completed)
    .catch(actions.misc.checkUsername.failed_);
});
actions.resources.createImport.listen(function(contents){
  if (contents.base64Encoded) {
    dataInterface.postCreateBase64EncodedImport(contents)
      .then(actions.resources.createImport.completed)
      .catch(actions.resources.createImport.failed);
  } else if (contents.content) {
    dataInterface.createResource(contents);
  }
});

actions.resources.createImport.completed.listen(function(contents){
  if (contents.status) {
    if(contents.status === 'processing') {
      notify(t('successfully uploaded file; processing may take a few minutes'));
      log('processing import ' + contents.uid, contents);
    } else {
      notify(`unexpected import status ${contents.status}`, 'error');
    }
  } else {
    notify(t('Error: import.status not available'));
  }
});

actions.resources.createResource.failed.listen(function(){
  log('createResourceFailed');
});

actions.resources.createSnapshot.listen(function(details){
  dataInterface.createAssetSnapshot(details)
    .then(actions.resources.createSnapshot.completed)
    .catch(actions.resources.createSnapshot.failed);
});

actions.resources.listTags.listen(function(data){
  dataInterface.listTags(data)
    .then(actions.resources.listTags.completed)
    .catch(actions.resources.listTags.failed);
});

actions.resources.listTags.completed.listen(function(results){
  if (results.next) {
    if (window.trackJs) {
      window.trackJs.track('MAX_TAGS_EXCEEDED: Too many tags');
    }
  }
});

actions.resources.updateAsset.listen(function(uid, values){
  return new Promise(function(resolve, reject){
    dataInterface.patchAsset(uid, values)
      .then(function(asset){
        actions.resources.updateAsset.completed(asset);
        resolve(asset);
      })
      .catch(function(...args){
        reject(args)
      });
  })
});

actions.resources.deployAsset.listen(function(uid, form_id_string, dialog){
  dataInterface.deployAsset(uid, form_id_string)
    .then((data) => {
      actions.resources.deployAsset.completed(data, dialog);
    })
    .catch((data) => {
      actions.resources.deployAsset.failed(data, dialog);
    });
});

actions.resources.deployAsset.completed.listen(function(data, dialog){
  // close the dialog.
  // (this was sometimes failing. possibly dialog already destroyed?)
  if(dialog && typeof dialog.destroy === 'function') {
    dialog.destroy();
  }
  // notify and redirect
  notify(t('deployed form'));
  window.setTimeout(function(){
    redirectTo(data.xform_url);
  }, 1000);
});

actions.resources.deployAsset.failed.listen(function(data, dialog){
  let dialogSettings = {
    title: t('unable to deploy'),
  };
  let dialogContent = false;

  let ok_button_text = t('ok');
  let ok_button_remove = false;

  if(!data.responseJSON || (!data.responseJSON.xform_id_string &&
                            !data.responseJSON.detail)) {
    // failed to retrieve a valid response from the server
    // setContent() removes the input box, but the value is retained
    dialogContent = `
      <p>${t('please check your connection and try again.')}</p>
      <p>${t('if this problem persists, contact support@kobotoolbox.org')}</p>
    `;
    ok_button_text = t('retry');
  } else if(!!data.responseJSON.xform_id_string){
    dialogSettings.message = `
      <p>${t('your form id was not valid:')}</p>
      <p><code>${data.responseJSON.xform_id_string}</code></p>
      <p>${t('please specify a different form id:')}</p>
    `;
  } else if(!!data.responseJSON.detail) {
    dialogContent = `
      <p>${t('your form cannot be deployed because it contains errors:')}</p>
      <p><code>${data.responseJSON.detail}</code></p>
    `;
    ok_button_remove = true;
  }
  dialog.set(dialogSettings);
  if (dialogContent) {
    dialog.setContent(dialogContent);
  }

  let ok_button = dialog.elements.buttons.primary.firstChild;
  if (ok_button_remove) {
    ok_button.remove();
  } else {
    ok_button.innerText = ok_button_text;
    ok_button.disabled = false;
  }
});

actions.resources.createResource.listen(function(details){
  return new Promise(function(resolve, reject){
    dataInterface.createResource(details)
      .then(function(asset){
        actions.resources.createResource.completed(asset);
        resolve(asset);
      })
      .catch(function(...args){
        actions.resources.createResource.failed(...args)
        reject(args);
      });
  });
});

actions.resources.deleteAsset.listen(function(details, params={}){
  var onComplete;
  if (params && params.onComplete) {
    onComplete = params.onComplete;
  }
  dataInterface.deleteAsset(details)
    .then(function(/*result*/){
      actions.resources.deleteAsset.completed(details);
      if (onComplete) {
        onComplete(details);
      }
    })
    .catch(actions.resources.deleteAsset.failed);
});
actions.resources.readCollection.listen(function(details){
  dataInterface.readCollection(details)
      .then(actions.resources.readCollection.completed)
      .catch(function(req, err, message){
        actions.resources.readCollection.failed(details, req, err, message);
      });
});

actions.resources.deleteCollection.listen(function(details){
  dataInterface.deleteCollection(details)
    .then(function(result){
      actions.resources.deleteCollection.completed(details, result);
    })
    .catch(actions.resources.deleteCollection.failed);
});

actions.resources.cloneAsset.listen(function(details, opts={}){
  dataInterface.cloneAsset(details)
    .then(function(...args){
      actions.resources.createAsset.completed(...args);
      actions.resources.cloneAsset.completed(...args);
      if (opts.onComplete) {
        opts.onComplete(...args);
      }
    })
    .catch(actions.resources.cloneAsset.failed);
});

actions.search.assets.listen(function(queryString){
  dataInterface.searchAssets(queryString)
    .then(function(...args){
      actions.search.assets.completed.apply(this, [queryString, ...args]);
    })
    .catch(function(...args){
      actions.search.assets.failed.apply(this, [queryString, ...args]);
    });
});

actions.search.libraryDefaultQuery.listen(function(){
  dataInterface.libraryDefaultSearch()
    .then(actions.search.libraryDefaultQuery.completed)
    .catch(actions.search.libraryDefaultQuery.failed);
});

actions.search.assetsWithTags.listen(function(queryString){
  dataInterface.assetSearch(queryString)
    .then(actions.search.assetsWithTags.completed)
    .catch(actions.search.assetsWithTags.failed);
});

actions.search.tags.listen(function(queryString){
  dataInterface.searchTags(queryString)
    .then(actions.search.searchTags.completed)
    .catch(actions.search.searchTags.failed);
});

actions.permissions.assignPerm.listen(function(creds){
  dataInterface.assignPerm(creds)
    .then(actions.permissions.assignPerm.completed)
    .catch(actions.permissions.assignPerm.failed);
});
actions.permissions.assignPerm.completed.listen(function(val){
  actions.resources.loadAsset({url: val.content_object});
});

actions.permissions.removePerm.listen(function(details){
  if (!details.content_object_uid) {
    throw new Error('removePerm needs a content_object_uid parameter to be set');
  }
  dataInterface.removePerm(details.permission_url)
    .then(function(resp){
      actions.permissions.removePerm.completed(details.content_object_uid, resp);
    })
    .catch(actions.permissions.removePerm.failed);
});

actions.permissions.removePerm.completed.listen(function(uid){
  actions.resources.loadAsset({id: uid});
});

actions.auth.login.listen(function(creds){
  dataInterface.login(creds).then(function(resp1){
    dataInterface.selfProfile().then(function(data){
        if(data.username) {
          actions.auth.login.loggedin(data);
        } else {
          actions.auth.login.passwordfail(resp1);
        }
      }).catch(actions.auth.login.failed);
  })
    .catch(actions.auth.login.failed);
});

// reload so a new csrf token is issued
actions.auth.logout.completed.listen(function(){
  window.setTimeout(function(){
    window.location.replace('', '');
  }, 1);
});

actions.auth.logout.listen(function(){
  dataInterface.logout().then(actions.auth.logout.completed).catch(function(){
    console.error('logout failed for some reason. what should happen now?');
  });
});
actions.auth.verifyLogin.listen(function(){
    dataInterface.selfProfile()
        .then((data/*, msg, req*/)=>{
          if (data.username) {
            actions.auth.verifyLogin.loggedin(data);
          } else {
            actions.auth.verifyLogin.anonymous(data);
          }
        })
        .catch(actions.auth.verifyLogin.failed);
});

actions.resources.loadAsset.listen(function(params){
  dataInterface.getAsset({uid: params.id})
      .then(actions.resources.loadAsset.completed)
      .catch(actions.resources.loadAsset.failed);
});

actions.resources.loadAsset.completed.listen(function(asset){
  actions.navigation.historyPush(asset);
});

actions.resources.loadAssetContent.listen(function(params){
  dataInterface.getAssetContent(params)
      .then(function(data, ...args) {
        // data.sheeted = new Sheeted([['survey', 'choices', 'settings'], data.data])
        actions.resources.loadAssetContent.completed(data, ...args);
      })
      .catch(actions.resources.loadAssetContent.failed);
});

actions.resources.listAssets.listen(function(){
  dataInterface.listAllAssets()
      .then(actions.resources.listAssets.completed)
      .catch(actions.resources.listAssets.failed);
});

actions.resources.listSurveys.listen(function(){
  dataInterface.listSurveys()
      .then(actions.resources.listAssets.completed)
      .catch(actions.resources.listAssets.failed);
});

actions.resources.listCollections.listen(function(){
  dataInterface.listCollections()
      .then(actions.resources.listCollections.completed)
      .catch(actions.resources.listCollections.failed);
});

actions.resources.listQuestionsAndBlocks.listen(function(){
  dataInterface.listQuestionsAndBlocks()
      .then(actions.resources.listAssets.completed)
      .catch(actions.resources.listAssets.failed);
});

module.exports = actions;
