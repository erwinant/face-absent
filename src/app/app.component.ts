import { Component, OnInit } from '@angular/core';
import * as $ from 'jquery';
import * as faceapi from 'face-api.js';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'face-absent';
  assetUrl = "http://localhost:4200/assets/";
  // tiny_face_detector options
  videoEl;
  stream;
  forwardTimes = [];
  persons = ["erwin", "kelvin", "dirga", "elvira", "gusmita", "adi","diana"];
  faceMatcher = null;
  constructor() {

  }

  getFaceImageUri(name, idx) {
    console.log(this.assetUrl + name + "/" + name + idx + ".png");
    return this.assetUrl + name + "/" + name + idx + ".png";
  }

  async loadMatcher(numImagesForTraining = 1) {
    const maxAvailableImagesPerClass = 5
    numImagesForTraining = Math.min(numImagesForTraining, maxAvailableImagesPerClass);

    const labeledFaceDescriptors = await Promise.all(this.persons.map(
      async className => {
        const descriptors = [];
        console.log(className);
        for (let i = 1; i < (numImagesForTraining + 1); i++) {
          const img = await faceapi.fetchImage(this.getFaceImageUri(className, i))
          descriptors.push(await faceapi.computeFaceDescriptor(img))
        }
        return new faceapi.LabeledFaceDescriptors(
          className,
          descriptors
        )
      }
    ))
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
      }, 500);

    } else {
      console.log('Camera not connected...');
    }
  }
  // async startTracking() {
  //   const videoEl = $('#videoEl').get(0);

  //   const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 128, scoreThreshold: 0.5 });
  //   const ts = Date.now();

  //   const detections = await faceapi.detectAllFaces(videoEl, options)
  //     .withAgeAndGender()
  //     .withFaceExpressions();

  //   if (videoEl.paused || videoEl.ended)
  //     return setTimeout(() => this.startTracking());

  //   const canvas = $('#overlay').get(0);
  //   const minConfidence = 0.05
  //   if (detections) {
  //     const dims = faceapi.matchDimensions(canvas, videoEl, true);
  //     const resizedResults = faceapi.resizeResults(detections, dims);
  //     faceapi.draw.drawDetections(canvas, resizedResults);
  //     faceapi.draw.drawFaceExpressions(canvas, resizedResults, minConfidence);
  //   } else {
  //     let w = canvas.width;
  //     canvas.width = 10;
  //     canvas.width = w;
  //   }
  //   setTimeout(() => this.startTracking());
  // }

  async startTrackingFace() {
    const videoEl = $('#videoEl').get(0);
    const minConfidence = 0.05
    //const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.8 });
    const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.7 });

    const detections = await faceapi.detectAllFaces(videoEl, options)
      .withFaceLandmarks()
      .withFaceDescriptors().withFaceExpressions().withAgeAndGender()

    if (videoEl.paused || videoEl.ended)
      return setTimeout(() => this.startTrackingFace());

    const canvas = $('#overlay').get(0);
    // if (detections) {
    const dims = faceapi.matchDimensions(canvas, videoEl, true);
    // resize detection and landmarks in case displayed image is smaller than
    // original size
    const resizedResults = faceapi.resizeResults(detections, dims);

    resizedResults.forEach(({ detection, descriptor, age, gender, genderProbability }) => {
      //faceapi.draw.drawFaceLandmarks(canvas, resizedResults);

      //ini bisa
      const fetchBest = this.faceMatcher.matchDescriptor(descriptor);

      //ini juga bisa
      // const fetchBest = this.faceMatcher.findBestMatch(descriptor);
      if (fetchBest.distance < 0.45) {
        const label = fetchBest.toString();
        const options = { label };
        const drawBox = new faceapi.draw.DrawBox(detection.box, options);
        faceapi.draw.drawFaceExpressions(canvas, resizedResults, minConfidence);
        new faceapi.draw.DrawTextField(
          [
            `${Math.round(age).toString()} years`,
            `${gender} (${Math.round(genderProbability).toString()})`,
          ],
          detection.box
        ).draw(canvas);
        drawBox.draw(canvas);
      }
    })
    setTimeout(() => this.startTrackingFace());
  }

  async ngOnInit() {

    await faceapi.nets.tinyFaceDetector.load('http://localhost:4200/assets/weights');
    await faceapi.nets.ssdMobilenetv1.load('http://localhost:4200/assets/weights');
    await faceapi.nets.ageGenderNet.load('http://localhost:4200/assets/weights');
    await faceapi.nets.faceLandmark68Net.load('http://localhost:4200/assets/weights');
    await faceapi.nets.faceExpressionNet.load('http://localhost:4200/assets/weights');
    await faceapi.nets.faceRecognitionNet.load('http://localhost:4200/assets/weights');
    this.faceMatcher = await this.loadMatcher(1);
    await this.cameraConnect();
  }
}
