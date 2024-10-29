const {
  S3Client,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  waitUntilObjectNotExists,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const fs = require("fs");

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const s3 = new S3Client({
  region: region,
});

async function getPreSignedUrl(key) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await getSignedUrl(s3, command, { expiresIn: 36000 });
}

async function uploadFile(file, contentType, contentDisposition, key) {
  //console.log("Inside uploadFile function", file, key, bucketName);
  //   const fileStream = await fs.createReadStream(file);
  //console.log("Here", file);
  const uploadParams = {
    Bucket: bucketName,
    Body: file,
    Key: key,
  };

  //console.log(uploadParams);
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Body: file,
    Key: key,
    ContentType: contentType,
    ContentDisposition: contentDisposition,
  });
  //console.log(command)
  try {
    const reply = await s3.send(command);
    //console.log(reply)
    return reply;
  } catch (err) {
    console.log("Caught error in S3Connect");
    return err;
  }
}

async function deleteObject(key) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const reply = await s3.send(command);
    console.log("Sent command", reply);
    // const reply2 = await waitUntilObjectNotExists({s3}, {
    //   Bucket: bucketName, Key: key
    // },)
    return reply;
  } catch (err) {
    console.log(err);
    return err;
  }
}

exports.UploadFile = uploadFile;
exports.GetPreSignedUrl = getPreSignedUrl;
exports.DeleteObject = deleteObject;
