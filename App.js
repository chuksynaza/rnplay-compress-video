'use strict';
import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  PermissionsAndroid
} from 'react-native';

import { RNCamera } from 'react-native-camera';

import { LogLevel, RNFFmpeg } from 'react-native-ffmpeg';

import RNFetchBlob from 'react-native-fetch-blob';

import { ProcessingManager } from 'react-native-video-processing';

export default class App extends Component {

  constructor(props){
    super(props);

    this.state = {
      recording: false
    }

    this.getPermissions();


  }

  async getPermissions(){
    try {

      console.log("Trying to Get Permissions");
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        )
        // const granted = await(
        //   PermissionsAndroid.request,
        //   PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        // ); // I used redux saga here. 'yield' keywoard. You don't have to use that. You can use async - await or Promises.

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          // Your Save flow
        }
      } else {
        // iOS here, so you can go to your Save flow directly
      }
    } catch (e) {
      console.log("Error Granting Permissions");
      console.log(e);
    }

  }

  render() {
    return (
      <View style={styles.container}>
        <RNCamera
          ref={ref => {
            this.camera = ref;
          }}
          style={styles.preview}
          type={RNCamera.Constants.Type.back}
          flashMode={RNCamera.Constants.FlashMode.on}
          permissionDialogTitle={'Permission to use camera'}
          permissionDialogMessage={'We need your permission to use your camera phone'}
          onGoogleVisionBarcodesDetected={({ barcodes }) => {
            console.log(barcodes)
          }}
        />
        <View style={{ flex: 0, flexDirection: 'row', justifyContent: 'center', }}>
          <TouchableOpacity
            onPress={(this.state.recording === true ? this.endRecord.bind(this) : this.recordVideo.bind(this))}
            style={styles.capture}
          >
            <Text style={{ fontSize: 14 }}> {(this.state.recording === true ? 'END' : 'RECORD')} </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  takePicture = async function () {
    if (this.camera) {
      const options = { quality: 0.5, base64: true };
      const data = await this.camera.takePictureAsync(options)
      console.log(data.uri);
    }
  };

  async compressVideo(dataSource, optionalCompressOptions = null){

    let result = {};

    result.error = false;

    let compressOptions = {
      width: 720,
      height: 1280,
      bitrateMultiplier: 3,
      saveToCameraRoll: true, // default is false, iOS only
      saveWithCurrentDate: true, // default is false, iOS only
      minimumBitrate: 300000,
      removeAudio: false, // default is false
    };

    //Merge the compress options if overidden
    if(optionalCompressOptions !== null){

      compressOptions = { ...compressOptions, ...optionalCompressOptions };

    }

    await ProcessingManager.compress(dataSource, compressOptions)
      .then((compressed) => {

        result.compressed = compressed;
        result.compressedPath = compressed.source;

      })
      .catch((error) => {

        result.error = true;
        result.errorDescription = error;

      });

      return result;

  }

  async checkSize(dataSource){

    let result = {};

    result.error = false;

    await RNFetchBlob.fs.readFile(dataSource, 'base64')
      .then((data) => {

        let decodedData = RNFetchBlob.base64.decode(data);
        let bytes = decodedData.length;

        result.bytes = bytes;
        result.kiloBytes = (bytes / 1024).toFixed(3);
        result.megaBytes = (bytes / 1048576).toFixed(2);
        result.gigaBytes = (bytes / 1073741824).toFixed(3);

      }).catch((error) => {

        result.error = true;
        result.errorDescription = error;

      });

      return result;

  }

  async saveVideo(dataSource, fileName = 'videoFromCompress'){

    let result = {};

    result.error = false;

    const dirs = RNFetchBlob.fs.dirs;

    let currentDate = new Date().toISOString().replace(/[:.]/gi, '');

    let savePath = dirs.DownloadDir + `/${currentDate}-ccc-${fileName}.mp4`;

    await RNFetchBlob.fs.cp(decodeURIComponent(dataSource.substr(7)), savePath)
      .then(() => {

        result.saved = true;
        result.savePath = savePath;

      })
      .catch((error) => {

        result.error = true;
        result.errorDescription = error

      });

      return result;

  }

  recordVideo = async function() {

    if (this.camera) {
      const options = {  };
      this.setState({recording: true});
      const data = await this.camera.recordAsync(options);

      console.log('Recording Complete');

      console.log(`Path: ${data.uri}`);

      console.log("Getting the Original Size");

      let theOriginalSize = await this.checkSize(data.uri);

      console.log(theOriginalSize);

      console.log("Compressing the Original Video");

      let theCompressed = await this.compressVideo(data.uri);

      console.log(theCompressed);

      console.log("Getting the Compressed Size");

      let theCompressedSize = await this.checkSize(theCompressed.compressedPath);

      console.log(theCompressedSize);

      console.log("Saving The Original Video");

      let savedOriginalVideo = await this.saveVideo(data.uri, 'original');

      console.log(savedOriginalVideo);

      console.log("Saving The Compressed Video");

      let savedCompressedVideo = await this.saveVideo(theCompressed.compressedPath, 'compressed');

      console.log(savedCompressedVideo);

    }

  }

  endRecord = function(){

    if (this.camera) {
      this.camera.stopRecording();
      this.setState({recording: false});
    }

  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'black'
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  capture: {
    flex: 0,
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 15,
    paddingHorizontal: 20,
    alignSelf: 'center',
    margin: 20
  }
});