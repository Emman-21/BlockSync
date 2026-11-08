import { onlineFetch } from '../offline/onlineFetch';
import { requireOnline } from '../offline/status';
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1920;
const WEBP_QUALITY = 0.82;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const getCloudinaryConfig = () => {
  const cloudName = String(
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || ""
  ).trim();

  const uploadPreset = String(
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || ""
  ).trim();

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Cloudinary is not configured. Check your VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET environment variables."
    );
  }

  return {
    cloudName,
    uploadPreset,
  };
};

export const validateImageFile = (file) => {
  if (!file) {
    throw new Error("Please select an image.");
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(
      "Invalid image type. Please select a JPG, PNG, WEBP, or GIF image."
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      "The selected image is too large. Maximum file size is 8 MB."
    );
  }

  return true;
};

const loadImageElement = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);

      reject(
        new Error(
          "Unable to read the selected image."
        )
      );
    };

    image.src = objectUrl;
  });

const canvasToBlob = (
  canvas,
  type,
  quality
) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(
          new Error(
            "Unable to compress the selected image."
          )
        );
      },
      type,
      quality
    );
  });

const createCompressedFileName = (
  originalName
) => {
  const baseName = String(
    originalName || "image"
  )
    .replace(/\.[^/.]+$/, "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${baseName || "image"}.webp`;
};

export const compressImage = async (
  file
) => {
  requireOnline("Image uploads");
  validateImageFile(file);

  // Canvas removes GIF animation, so GIF files
  // are uploaded without client-side compression.
  if (file.type === "image/gif") {
    return file;
  }

  const image = await loadImageElement(file);

  const originalWidth =
    image.naturalWidth || image.width;

  const originalHeight =
    image.naturalHeight || image.height;

  if (!originalWidth || !originalHeight) {
    throw new Error(
      "The selected image has invalid dimensions."
    );
  }

  const scale = Math.min(
    1,
    MAX_IMAGE_DIMENSION /
      Math.max(
        originalWidth,
        originalHeight
      )
  );

  const targetWidth = Math.max(
    1,
    Math.round(originalWidth * scale)
  );

  const targetHeight = Math.max(
    1,
    Math.round(originalHeight * scale)
  );

  const canvas =
    document.createElement("canvas");

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d", {
    alpha: true,
  });

  if (!context) {
    throw new Error(
      "Image compression is not supported by this browser."
    );
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  context.clearRect(
    0,
    0,
    targetWidth,
    targetHeight
  );

  context.drawImage(
    image,
    0,
    0,
    targetWidth,
    targetHeight
  );

  const compressedBlob =
    await canvasToBlob(
      canvas,
      "image/webp",
      WEBP_QUALITY
    );

  canvas.width = 1;
  canvas.height = 1;

  // Keep the original when compression creates
  // a larger file and resizing was not needed.
  if (
    scale === 1 &&
    compressedBlob.size >= file.size
  ) {
    return file;
  }

  return new File(
    [compressedBlob],
    createCompressedFileName(file.name),
    {
      type: "image/webp",
      lastModified: Date.now(),
    }
  );
};

export const uploadImage = async (
  file,
  folder = "general"
) => {
  requireOnline("Image uploads");
  validateImageFile(file);

  const {
    cloudName,
    uploadPreset,
  } = getCloudinaryConfig();

  const uploadFile =
    await compressImage(file);

  const normalizedFolder = String(
    folder || "general"
  )
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const formData = new FormData();

  formData.append("file", uploadFile);
  formData.append(
    "upload_preset",
    uploadPreset
  );

  formData.append(
    "folder",
    `itnt3108-block-system/${
      normalizedFolder || "general"
    }`
  );

  const response = await onlineFetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result?.error?.message ||
        "Unable to upload the image to Cloudinary."
    );
  }

  if (!result.secure_url) {
    throw new Error(
      "Cloudinary did not return an image URL."
    );
  }

  return {
    url: result.secure_url,
    publicId: result.public_id || "",
    width: Number(result.width || 0),
    height: Number(result.height || 0),
    format: result.format || "",
    bytes: Number(result.bytes || 0),
    originalBytes: Number(file.size || 0),
    uploadedBytes: Number(
      uploadFile.size || 0
    ),
    compressed: uploadFile !== file,
  };
};

export const getOptimizedImageUrl = (
  imageUrl,
  options = {}
) => {
  if (
    !imageUrl ||
    !String(imageUrl).includes(
      "res.cloudinary.com"
    )
  ) {
    return imageUrl || "";
  }

  const {
    width = 1200,
    quality = "auto",
    format = "auto",
  } = options;

  const safeWidth = Math.max(
    1,
    Math.min(
      2400,
      Number(width) || 1200
    )
  );

  const transformation =
    `f_${format},q_${quality},` +
    `w_${safeWidth},c_limit`;

  return String(imageUrl).replace(
    "/upload/",
    `/upload/${transformation}/`
  );
};