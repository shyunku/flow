export function requestPermission({ mic = false, camera = false, screen = false }) {
  if (navigator.permissions && navigator.permissions.query) {
    // chromium
    if (mic) {
      navigator.permissions.query({ name: "microphone" }).then((permissionStatus) => {
        console.log(permissionStatus);
        if (permissionStatus.state === "denied") {
          noticeMicPermissionDenied();
        }
        permissionStatus.onchange = () => {
          console.log(`Microphone Permission state changed: ${permissionStatus.state}`);
          if (permissionStatus.state === "denied") {
            noticeMicPermissionDenied();
          }
        };
      });
    }
    if (camera) {
      navigator.permissions.query({ name: "camera" }).then((permissionStatus) => {
        console.log(permissionStatus);
        if (permissionStatus.state === "denied") {
          noticeVideoPermissionDenied();
        }
        permissionStatus.onchange = () => {
          console.log(`Video Permission state changed: ${permissionStatus.state}`);
          if (permissionStatus.state === "denied") {
            noticeVideoPermissionDenied();
          }
        };
      });
    }
    if (screen) {
      navigator.permissions.query({ name: "display-capture" }).then((permissionStatus) => {
        console.log(permissionStatus);
        if (permissionStatus.state === "denied") {
          alert("display-capture permission is denied.");
        }
        permissionStatus.onchange = () => {
          console.log(`Display Capture Permission state changed: ${permissionStatus.state}`);
          if (permissionStatus.state === "denied") {
            alert("display-capture permission is denied.");
          }
        };
      });
    }
  } else {
    console.log(navigator.mediaDevices);
    throw new Error("Not chromium browser. Permission check skipping.");
  }
}

function noticeMicPermissionDenied() {
  if (window.chrome) {
    alert(
      "Microphone permission is denied.\n" +
        "1. Click the Site Information option.\n" +
        "2. Click Site Settings option.\n" +
        "3. Set the Microphone drop-down option to Allow."
    );
  } else {
    alert("microphone permission is denied.");
  }
}

function noticeVideoPermissionDenied() {
  if (window.chrome) {
    alert(
      "Video permission is denied.\n" +
        "1. Click the Site Information option.\n" +
        "2. Click Site Settings option.\n" +
        "3. Set the Camera drop-down option to Allow."
    );
  } else {
    alert("microphone permission is denied.");
  }
}
