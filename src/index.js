import React from "react";
import ReactDOM from "react-dom";

import * as faceapi from "face-api.js";
import "./styles.css";

const MODEL_WEIGHTS = "weights";

class App extends React.Component {
  state = {
    label: ""
  };
  videoRef = React.createRef();
  canvasRef = React.createRef();
  face1Ref = React.createRef();
  face2Ref = React.createRef();

  componentDidMount() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const webCamPromise = navigator.mediaDevices
        .getUserMedia({
          audio: false,
          video: {
            facingMode: "user"
          }
        })
        .then(stream => {
          window.stream = stream;
          this.videoRef.current.srcObject = stream;
          return new Promise((resolve, reject) => {
            this.videoRef.current.onloadedmetadata = () => {
              resolve();
            };
          });
        });
      const modelPromise = faceapi.loadSsdMobilenetv1Model(MODEL_WEIGHTS);
      const modelPromise2 = faceapi.loadFaceRecognitionModel(MODEL_WEIGHTS);
      Promise.all([modelPromise, modelPromise2, webCamPromise])
        .then(values => {
          this.detectFrame(this.videoRef.current);
          
        })
        .catch(error => {
          console.error(error);
        });
        
    }
  }

  detectFrame = video => {
    

    faceapi.detectAllFaces(video).then(predictions => {
      const face1 = predictions[0];
      const face2 = predictions[1];
      let desc1 = null;
      let desc2 = null;
      if (face1) {
        const destCtx = this.face1Ref.current.getContext("2d");
        destCtx.drawImage(
          video,
          face1.box._x,
          face1.box._y,
          face1.box._width,
          face1.box._height,
          0,
          0,
          100,
          100
        );
        desc1 = faceapi.computeFaceDescriptor(this.face1Ref.current);
      } else {
        const destCtx = this.face1Ref.current.getContext("2d");
        destCtx.clearRect(0, 0, destCtx.canvas.width, destCtx.canvas.height);
      }
      if (face2) {
        const destCtx = this.face2Ref.current.getContext("2d");
        destCtx.drawImage(
          video,
          face2.box._x,
          face2.box._y,
          face2.box._width,
          face2.box._height,
          0,
          0,
          100,
          100
        );
        desc2 = faceapi.computeFaceDescriptor(this.face2Ref.current);
      } else {
        const destCtx = this.face2Ref.current.getContext("2d");
        destCtx.clearRect(0, 0, destCtx.canvas.width, destCtx.canvas.height);
      }
      if (desc1 && desc2) {
        Promise.all([desc1, desc2]).then(res => {
          const distance = faceapi.round(
            faceapi.euclideanDistance(res[0], res[1])
          );
          this.setState({
            label: distance > 0.60? "NO MATCH :(" : "FACES MATCH!",
            color: distance > 0.60 ? "#cc0000" : "#66ff66"
          });
          this.renderPredictions(predictions);
          requestAnimationFrame(() => {
            this.detectFrame(video);
          });
        });
      } else {
        this.setState({
          label: ""
        });
        this.renderPredictions(predictions);
        requestAnimationFrame(() => {
          this.detectFrame(video);
        });
      }
    });
  };

  renderPredictions = predictions => {
    const ctx = this.canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    predictions.forEach(prediction => {
      const x = prediction.box._x;
      const y = prediction.box._y;
      const width = prediction.box._width;
      const height = prediction.box._height;
      // Draw the bounding box.
      ctx.strokeStyle = "#00FFFF";
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, width, height);
    });
  };

  render() {
    return (
      <div>
        <video
          className="size"
          autoPlay
          playsInline
          muted
          ref={this.videoRef}
          width="600"
          height="500"
        />
        <canvas
          className="size"
          ref={this.canvasRef}
          width="600"
          height="500"
        />
        <canvas
          className="face1"
          ref={this.face1Ref}
          width="100"
          height="100"
        />
        <canvas
          className="face2"
          ref={this.face2Ref}
          width="100"
          height="100"
        />
        <div className="label" style={{ color: this.state.color }}>
          {this.state.label}
        </div>
      </div>
    );
  }
}


const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
