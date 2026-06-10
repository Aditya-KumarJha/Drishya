import ImageKit from "imagekit";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

const getImageKitFolder = () =>
  process.env.IMAGEKIT_PROFILE_FOLDER || "/drishya/profiles";

const parseDataUrl = (value) => {
  const match = String(value || "").match(/^data:(.+);base64,(.+)$/);

  if (!match) return null;

  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
};

export const uploadProfileImage = async ({ userId, image }) => {
  if (!image) return "";

  // already uploaded
  if (/^https?:\/\//i.test(image)) {
    return image;
  }

  const parsed = parseDataUrl(image);

  if (!parsed) {
    throw new Error(
      "Profile image must be a URL or base64 data URL"
    );
  }

  if (parsed.buffer.length > 2 * 1024 * 1024) {
    throw new Error(
      "Profile image cannot exceed 2MB"
    );
  }

  const extension = parsed.contentType.includes("png")
    ? "png"
    : parsed.contentType.includes("webp")
    ? "webp"
    : "jpg";

  const fileName = `profile-${userId}-${Date.now()}.${extension}`;

  try {
    const response = await imagekit.upload({
      file: parsed.buffer,
      fileName,
      folder: getImageKitFolder(),
      useUniqueFileName: true,
      tags: ["drishya", "profile"],
    });

    return response.url;
  } catch (error) {
    console.error("ImageKit Upload Error:", error);
    throw new Error(
      error.message || "Failed to upload profile image"
    );
  }
};