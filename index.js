const imageInput = document.getElementById("setting_image");
const imagePreview = document.getElementById("setting_image_preview");
const imageEmpty = document.getElementById("setting_image_empty");

let previewUrl = null;

const clearPreview = () => {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
  imagePreview.removeAttribute("src");
  imagePreview.classList.remove("is-visible");
  imageEmpty.hidden = false;
};

imageInput.addEventListener("change", () => {
  const file = imageInput.files && imageInput.files[0];

  if (!file) {
    clearPreview();
    return;
  }

  if (!file.type.startsWith("image/")) {
    clearPreview();
    imageEmpty.textContent = "画像ファイルを選択してください";
    return;
  }

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }

  previewUrl = URL.createObjectURL(file);
  imagePreview.src = previewUrl;
  imagePreview.classList.add("is-visible");
  imageEmpty.hidden = true;
});

clearPreview();
