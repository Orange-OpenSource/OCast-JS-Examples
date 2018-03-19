/*
 *
 * Orange Default Receiver
 *
 * File name:   receiver.js
 * Version:     2.0.1
 *
 * Copyright (C) 2015 Orange
 *
 * This software is confidential and proprietary information of Orange.
 * You shall not disclose such Confidential Information and shall use it only in
 * accordance with the terms of the agreement you entered into.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 *
 * If you are Orange employee you shall use this software in accordance with
 * the Orange Source Charter ( http://opensource.itn.ftgroup/index.php/Orange_Source ).
 *
 */
'use strict'
import {
    EnumError,
    EnumMediaStatus,
    OCast,
    Logger,
    VideoPlaybackStatus,
    EnumMedia
} from "https://unpkg.com/ocast-sdk";

let Log = Logger.getInstance();
Log.setDebugLevel(Logger.DEBUG);

var currentContainer, osdTimeout,
    volumeTimeout, isLive = false;
const TAG = " [OCast Default Receiver] ";

function toTimer(seconds) {
    var h, m, s;

    h = Math.floor(seconds / 3600);
    h = isNaN(h) ? '--' : (h >= 10) ? h : '0' + h;
    m = Math.floor(seconds / 60 % 60);
    m = isNaN(m) ? '--' : (m >= 10) ? m : '0' + m;
    s = Math.floor(seconds % 60);
    s = isNaN(s) ? '--' : (s >= 10) ? s : '0' + s;

    return h + ':' + m + ':' + s;
}
function displayHome() {
    Log.debug(TAG + "displayHome");
    currentContainer.hide();
    currentContainer = $('#ready-container');
    currentContainer.show();
    Log.debug(TAG + 'displayHome : done.');
}

function displayPlayer(bool) {
    Log.debug(TAG + "displayPlayer (" + bool +")");
    currentContainer.hide();
    currentContainer = $('#player-container');
    currentContainer.show();
    Log.debug(TAG + 'displayPlayer : done.');
}

function displayImage(bool) {
    Log.debug(TAG + "displayImage (" + bool +")");
    currentContainer.hide();
    currentContainer = $('#image-container');
    currentContainer.show();
    Log.debug(TAG + 'displayImage : done.');
}

function displayError(title, message) {
    Log.debug(TAG + "displayError", title, message);
    currentContainer.hide();
    currentContainer = $('#error-container');
    currentContainer.show();
    $('#message-title').text(title);
    $('#message-description').text(message);
}

function displayPause(bool) {
    Log.debug(TAG + "displayPause ", $('state'));
    if (bool) {
        $('#state').fadeIn("fast");
    } else {
        $('#state').fadeOut("fast");
    }
}

function displayOsd(autohide) {
    Log.debug(TAG + "displayOsd (" + autohide +")");
    $('#osd').fadeIn("fast");
    clearTimeout(osdTimeout);
    if (autohide) {
        osdTimeout = setTimeout(() => {
            $('#osd').fadeOut("fast");
        }, 5000);
    }
}

function displayVolume(autohide) {
    Log.debug(TAG + "displayVolume (" + autohide + ")");
    $('#volume').fadeIn("fast");
    clearTimeout(volumeTimeout);
    if (autohide) {
        volumeTimeout = setTimeout( () => {
            $('#volume').fadeOut("fast");
        }, 2000);
    }
}

function displayBuffering(bool) {
    Log.debug(TAG + "displayBuffering", bool);
    if (bool) {
        $('#buffering').fadeIn("fast");
    } else {
        $('#buffering').fadeOut("fast");
    }
}

function displayMute(bool) {
    if (bool) {
        $('#mute').fadeIn("fast");
    } else {
        $('#mute').fadeOut("fast");
    }
}

function clearPlayer() {
    Log.debug(TAG + "clearPlayer");
    //clear media

    this.media.src = '';
    //reset osd
    //TODO $('#time-current').text('--:--:--');
    //TODO $('#time-total').text('--:--:--');
    //TODO $('#progress-bar').css('width', 0 + '%');
}


var init = function () {
    var
        $title = $('#title'),
        $subtitle = $('#subtitle'),
        $logo = $('#logo'),
        $progressBar = $('#progress-bar'),
        $volumeBar = $('#volume-bar'),
        $totalTime = $('#time-total'),
        $currentTime = $('#time-current');

    //set default container as current for transitions
    currentContainer = $('#ready-container');

    // i18n setup
    // ---------------------------------------------------------------
    // I18N, by default use the browser's language (normally english)
    // If ?setLng=fr is passed in the URL, we use French strings
    i18n.init({
        debug: false,
        lng: (navigator.language) ? navigator.language : navigator.userLanguage,
        fallbackLng: 'fr',
        getAsync: false, // Get it synchronously, can't do much without it
        load: 'unspecific', // Load en instead of en-GB, fr instead of fr-FR
        useCookie: false
    });
    $('#error').append(i18n.t('error.title'));

    // Initialize OCast
    let _ocast = new OCast();
    console.log("ocast", _ocast);
    _ocast.debug = true;
    // Start Websocket
    _ocast.start();
    // Get OCast Channel
    let mediaChannel = _ocast.getMediaChannel();
    mediaChannel.addVideoMediaManager([EnumMedia.AUDIO, EnumMedia.VIDEO],  document.getElementById('media'));
    mediaChannel.addImageMediaManager([EnumMedia.IMAGE],  document.getElementById('img'));

    // Set Callback
    mediaChannel.setNotifier(this);


    // Create a Custom Channel
    // Create a Custom Channel
    let CUSTOM_NAMESPACE = "urn:x-cast:sample";
    let customChannel = _ocast.createChannel(CUSTOM_NAMESPACE);
    customChannel.onMessage = (openCastDeviceMessage) => {
        console.log(TAG + "onMessage:"+openCastDeviceMessage.data+" from:"+openCastDeviceMessage.src);
        // 1- Reply
        this.sendReply(openCastDeviceMessage.id, openCastDeviceMessage.src, {params: {code: EnumError.OK}});
        // 2- Display Information
        clearPlayer();
        displayError(i18n.t('message.title'), JSON.stringify(openCastDeviceMessage));
        // 3- Send Specific Command
        this.sendEvent({customPlayer:"ready"});
    };

    this.onPrepare =  (url, title, subtitle, logo, mediaType, transferMode, autoplay, frequency, options) => {
        Log.debug(TAG + 'onPrepare(' + url + ',' + mediaType+ ',' +transferMode + ',' + autoplay + ')');
        switch (mediaType) {
            case EnumMedia.AUDIO:
            case EnumMedia.VIDEO:
                // todo: isLive = this.media.isLive;
                Log.debug(TAG + "onLoad - play audio/video.");
                displayPlayer(true);
                var thumbnail = options && options.images && options.images[0] && options.images[0].url ? options.images[0].url : '';
                $logo.attr('src', thumbnail);
                if (thumbnail !== '') {
                    $logo.show();
                } else {
                    $logo.hide();
                }
                $subtitle.text(subtitle!=null? subtitle : "");
                $title.text(title != null ? title : "");

                displayOsd(mediaType==='video');
                break;
            case EnumMedia.IMAGE:
                Log.debug(TAG + "onLoad; show image."+url);
                displayImage(true);
                break;
            default :
                displayError(i18n.t('error.title'), i18n.t('error.media-error'));
                console.error(TAG + 'onPrepare; Unknown media type ('+mediaType+') => can not display player.');
                return EnumError.UNKNOWN_MEDIA_TYPE;
        }

        Log.debug(TAG + "onLoad; done.");
        return EnumError.OK;
    };

    // On Seek Event
    this.onSeek =  (position, options) => {
        displayOsd(true);
        displayPause(false);
        displayBuffering(false);
        return EnumError.OK;
    };


    // Change Track callback
    this.onTrack =  (type, trackId, enabled, options) => {
        return EnumError.OK;
    };

    // Resum Callback
    this.onResume =  (options) => {
        displayOsd(true);
        displayPause(false);
        displayBuffering(false);
        return EnumError.OK;
    };

    // On Pause event
    this.onPause =  () => {
        displayOsd(true);
        displayPause(true);
        return EnumError.OK;
    };

    // On set volume event
    this.onVolume =  (level) => {
        Log.debug(TAG + "onSetVolume", level);
        displayVolume(true);
        console.log("width", (level / 1) * 100, "volumeBar", $volumeBar, $volumeBar.css('width'));
        $volumeBar.css('width', level / 1 * 100 + '%');
        return EnumError.OK;
    };

    // On set mute event
    this.onMute = (mute) => {
        displayMute(mute);
        return EnumError.OK;
    };

    // On close event
    this.onClose =  () => {
        Log.debug(TAG + "onClose");
        displayHome();
        return EnumError.OK;
    };

    // On stop Event
    this.onStop =  () => {
        Log.debug(TAG + "onStop");
        displayHome();
        return EnumError.OK;
    };
    this.onUpdateMetadata = function (){

    }
    // On updateStatus
    this.onUpdateStatus = (playbackStatus) => {
        Log.debug(TAG + " onUpdateStatus", playbackStatus);
        if (playbackStatus instanceof VideoPlaybackStatus) {
            var current = toTimer(playbackStatus.position),
                total = toTimer(playbackStatus.duration),
                percentage = Math.floor((100 / playbackStatus.duration) * playbackStatus.position);

            $currentTime.text(current);
            if (isLive) {
                $totalTime.text('');
            } else {
                $totalTime.text(total);
            }
            $progressBar.css('width', percentage + '%');
        }
        switch (playbackStatus.status)  {
            case EnumMediaStatus.ERROR:
                Log.debug(TAG + "onError");
                displayBuffering(false);
                $('#osd').hide();
                displayError(i18n.t('error.title'), i18n.t('error.network-error'));
                break;
            case EnumMediaStatus.BUFFERING:
                displayBuffering(true);
            default:
                displayBuffering(false);
        }
    };
};

$(init);
