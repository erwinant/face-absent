import { Component, OnInit, AfterViewInit } from '@angular/core';
import * as $ from 'jquery';
import * as canvas from 'canvas';
import * as faceapi from 'face-api.js';
import { FaceExpressions, FaceDetection } from 'face-api.js';

// patch nodejs environment, we need to provide an implementation of
// HTMLCanvasElement and HTMLImageElement, additionally an implementation
// of ImageData is required, in case you want to use the MTCNN
const { Canvas, Image, ImageData } = canvas;
// faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const TINY_FACE_DETECTOR = 'tiny_face_detector';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  title = 'face-absent';
  assetUrl = "http://localhost:4200/assets/";
  // tiny_face_detector options
  videoEl;
  stream;
  forwardTimes = [];
  persons = ["erwin","kelvin"];
  faceMatcher = null;
  constructor() {

  }

  async ngAfterViewInit() {

    await faceapi.nets.tinyFaceDetector.load('http://localhost:4200/assets/weights');
    await faceapi.nets.ssdMobilenetv1.load('http://localhost:4200/assets/weights');
    //await faceapi.nets.ageGenderNet.load('http://localhost:4200/assets/weights');
    await faceapi.nets.faceLandmark68Net.load('http://localhost:4200/assets/weights');
    //await faceapi.nets.faceExpressionNet.load('http://localhost:4200/assets/weights');
    await faceapi.nets.faceRecognitionNet.load('http://localhost:4200/assets/weights');
    this.faceMatcher = await this.loadMatcher(2);
    this.loadModels();
  }
  getFaceImageUri(name,idx) {
    console.log(this.assetUrl + name+"/"+name + idx + ".png");
    return this.assetUrl + name+"/"+name + idx + ".png";
  }

  async loadMatcher(numImagesForTraining = 1) {
    const maxAvailableImagesPerClass = 5
    numImagesForTraining = Math.min(numImagesForTraining, maxAvailableImagesPerClass);

    const labeledFaceDescriptors = await Promise.all(this.persons.map(
      async className => {
        const descriptors = [];
        console.log(className);
        for (let i = 1; i < (numImagesForTraining + 1); i++) {
          const img = await faceapi.fetchImage(this.getFaceImageUri(className,i))
          descriptors.push(await faceapi.computeFaceDescriptor(img))
        }
        return new faceapi.LabeledFaceDescriptors(
          className,
          descriptors
        )
      }
    ))
    console.log(labeledFaceDescriptors);
    return new faceapi.FaceMatcher(labeledFaceDescriptors)
  }
  async loadModels() {
    await this.cameraConnect();
  }
  async cameraConnect() {
    this.stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    this.videoEl = $('#videoEl').get(0);
    this.videoEl.srcObject = this.stream;
    if (this.videoEl.srcObject.active === true) {
      setTimeout(() => {
        this.startTrackingFace();
      }, 1000);

    } else {
      console.log('Camera not connected...');
    }
  }
  async startTracking() {
    const videoEl = $('#videoEl').get(0);

    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 128, scoreThreshold: 0.5 });
    const ts = Date.now();

    const detections = await faceapi.detectAllFaces(videoEl, options)
      .withAgeAndGender()
      .withFaceExpressions();

    if (videoEl.paused || videoEl.ended)
      return setTimeout(() => this.startTracking());

    const canvas = $('#overlay').get(0);
    const minConfidence = 0.05
    if (detections) {
      const dims = faceapi.matchDimensions(canvas, videoEl, true);
      const resizedResults = faceapi.resizeResults(detections, dims);
      faceapi.draw.drawDetections(canvas, resizedResults);
      faceapi.draw.drawFaceExpressions(canvas, resizedResults, minConfidence);
    } else {
      let w = canvas.width;
      canvas.width = 10;
      canvas.width = w;
    }
    setTimeout(() => this.startTracking());
  }

  async startTrackingFace() {
    const videoEl = $('#videoEl').get(0);

    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.8 });
    //const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.1 });

    const detections = await faceapi.detectAllFaces(videoEl, options)
      .withFaceLandmarks()
      .withFaceDescriptors()

    if (videoEl.paused || videoEl.ended)
      return setTimeout(() => this.startTracking());

    const canvas = $('#overlay').get(0);
    // if (detections) {
    const dims = faceapi.matchDimensions(canvas, videoEl, true);
    // resize detection and landmarks in case displayed image is smaller than
    // original size
    const resizedResults = faceapi.resizeResults(detections, dims)

    resizedResults.forEach(({ detection, descriptor }) => {
      const fetchBest = this.faceMatcher.findBestMatch(descriptor);
      if (fetchBest.label !== 'unknown') {
        //const label = fetchBest.toString();
        const label = fetchBest.label;
        const options = { label }
        const drawBox = new faceapi.draw.DrawBox(detection.box, options)
        drawBox.draw(canvas)
      }

    })
    // } else {
    //   let w = canvas.width;
    //   canvas.width = 10;
    //   canvas.width = w;
    // }
    setTimeout(() => this.startTrackingFace());
  }

  ngOnInit() {

    //await faceapi.nets.ssdMobilenetv1.loadFromUri('https://github.com/justadudewhohacks/face-api.js/tree/master/weights')
    //const input = document.getElementById("myVideo") as HTMLVideoElement;
    //const options = getFaceDetectorOptions();
    //const detections = await faceapi.detectAllFaces(input).withAgeAndGender();
    //console.log(detections);

    // const canvas2 = faceapi.createCanvasFromMedia(document.getElementsByClassName("webcam-wrapper")[0].childNodes);
  }
}
