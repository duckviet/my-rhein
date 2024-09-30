let mouseX = 0;
let mouseY = 0;
let selectedImage = null;
let draggedElement = null;
const STORE_IMAGE = "rhein-img-key-";
const STORE_POSITION = "rhein-img-position-";

// Utility to generate a random ID
function generateRandomId(length = 6) {
  return Math.random()
    .toString(36)
    .substring(2, length + 2);
}

// Throttle function to improve performance on high-frequency events
function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Monitor mouse position and adjust for scroll
function mouseMonitor(e) {
  mouseX = e.clientX + window.scrollX;
  mouseY = e.clientY + window.scrollY;
}

// Validate position object
function isValidPosition(position) {
  return (
    position &&
    typeof position.left === "number" &&
    typeof position.top === "number" &&
    !isNaN(position.left) &&
    !isNaN(position.top)
  );
}

// Save image position to localStorage
function saveImagePosition(img_id, position) {
  if (!isValidPosition(position)) {
    console.error(`Invalid position for ${img_id}:`, position);
    return;
  }
  const positionKey = STORE_POSITION + img_id;
  localStorage.setItem(positionKey, JSON.stringify(position));
}

// Handle image paste event
function handleImagePaste(e) {
  e.preventDefault();
  const items = e.clipboardData.items;

  Array.from(items).forEach((item) => {
    if (item.type.indexOf("image") !== -1) {
      const blob = item.getAsFile();
      const reader = new FileReader();

      reader.onload = (event) => {
        const img_id = generateRandomId();
        localStorage.setItem(
          STORE_IMAGE + img_id,
          JSON.stringify(event.target.result)
        );

        const initialPosition = { left: mouseX, top: mouseY };
        const img = createImageElement(
          event.target.result,
          img_id,
          initialPosition
        );

        document.getElementById("images").appendChild(img);
        saveImagePosition(img_id, initialPosition);
      };

      reader.readAsDataURL(blob);
    }
  });
}

// Create a new image element
function createImageElement(src, img_id, position) {
  const img = document.createElement("img");
  img.src = src;
  img.alt = "pasted-image";
  img.style.width = "auto";
  img.style.minHeight = "30px";
  img.style.maxHeight = "300px";
  img.style.position = "absolute";
  img.style.left = `${position.left}px`;
  img.style.top = `${position.top}px`;
  img.style.cursor = "move";
  img.id = `pasted-image-${img_id}`;

  img.addEventListener("mousedown", (e) => startDragging(e, img_id));
  img.addEventListener("click", () => selectImage(img));

  return img;
}

// Start dragging an image
function startDragging(e, img_id) {
  draggedElement = e.target;
  const rect = draggedElement.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;

  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", () => stopDragging(img_id));
}

function drag(e) {
  if (draggedElement) {
    const x = e.clientX - offsetX + window.scrollX;
    const y = e.clientY - offsetY + window.scrollY;

    draggedElement.style.left = `${x}px`;
    draggedElement.style.top = `${y}px`;
  }
}

function stopDragging(img_id) {
  if (draggedElement) {
    const imgPosition = {
      left: Number(draggedElement.style.left.replace("px", "")),
      top: Number(draggedElement.style.top.replace("px", "")),
    };

    saveImagePosition(img_id, imgPosition);
  }

  draggedElement = null;
  document.removeEventListener("mousemove", drag);
  document.removeEventListener("mouseup", stopDragging);
}

// Select an image
function selectImage(img) {
  if (selectedImage) {
    selectedImage.style.border = "none"; // Deselect previous
  }

  // Toggle selection
  if (selectedImage === img) {
    selectedImage = null; // Deselect if clicked again
  } else {
    selectedImage = img;
  }
}
// Unselect image when clicking outside of the selected one
function unselectImage(e) {
  if (selectedImage && !selectedImage.contains(e.target)) {
    selectedImage.style.border = "none";
    selectedImage = null;
  }
}
function handleKeyDown(e) {
  if (e.key === "Backspace" && selectedImage) {
    const img_id = selectedImage.id.split("-").pop();
    localStorage.removeItem(STORE_IMAGE + img_id);
    localStorage.removeItem(STORE_POSITION + img_id);
    selectedImage.remove();
    selectedImage = null;
  }
}

// Check localStorage integrity
function checkLocalStorageIntegrity() {
  const storageLength = localStorage.length;
  for (let i = 0; i < storageLength; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(STORE_POSITION)) {
      const rawPosition = localStorage.getItem(key);
      try {
        const position = JSON.parse(rawPosition);
        if (!isValidPosition(position)) {
          console.warn(
            `Invalid position found for ${key}, removing:`,
            rawPosition
          );
          localStorage.removeItem(key);
        }
      } catch (error) {
        console.error(`Error parsing position for ${key}:`, error);
        localStorage.removeItem(key);
      }
    }
  }
}

function loadImagesFromStorage() {
  checkLocalStorageIntegrity();

  const storageLength = localStorage.length;
  for (let i = 0; i < storageLength; i++) {
    const key = localStorage.key(i);

    if (key.startsWith(STORE_IMAGE)) {
      const imgData = JSON.parse(localStorage.getItem(key));
      const img_id = key.replace(STORE_IMAGE, "");

      const positionKey = STORE_POSITION + img_id;
      const rawPosition = localStorage.getItem(positionKey);

      let imgPosition;
      try {
        imgPosition = rawPosition ? JSON.parse(rawPosition) : null;
      } catch (error) {
        console.error(`Error parsing position for ${img_id}:`, error);
        imgPosition = null;
      }

      if (imgPosition === null || !isValidPosition(imgPosition)) {
        console.warn(`No valid position found for ${img_id}, using default`);
        imgPosition = { left: 0, top: 0 };
      }

      const img = createImageElement(imgData, img_id, imgPosition);
      document.getElementById("images").appendChild(img);
    }
  }
}

// Attach event listeners
window.addEventListener("load", () => {
  document.addEventListener("mousemove", throttle(mouseMonitor, 100));
  document.addEventListener("paste", handleImagePaste);
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("mousedown", unselectImage); // Add this line

  loadImagesFromStorage();
});

// window.addEventListener("beforeunload", function () {
//   console.log("localStorage before unload:", { ...localStorage });
// });

// window.addEventListener("storage", function (e) {
//   if (e.key && e.key.startsWith(STORE_POSITION)) {
//     console.log(
//       `localStorage '${e.key}' changed:`,
//       e.oldValue,
//       "->",
//       e.newValue
//     );
//   }
// });
