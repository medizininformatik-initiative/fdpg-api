import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { SupportedMimetype } from 'src/modules/proposal/enums/supported-mime-type.enum';
import { validateMimetype } from './validate-mimetype.util';
const supportedMimetypes = Object.values(SupportedMimetype);
const images = [
  SupportedMimetype.Jpeg,
  SupportedMimetype.Png,
  SupportedMimetype.Bmp,
  SupportedMimetype.Svg,
  SupportedMimetype.Tiff,
  SupportedMimetype.Gif,
  SupportedMimetype.Heic,
  SupportedMimetype.Heif,
];
const pdf = [SupportedMimetype.Pdf];
const documents = [
  SupportedMimetype.MsWord,
  SupportedMimetype.MsWordX,
  SupportedMimetype.Pdf,
  SupportedMimetype.OpendocumentText,
  SupportedMimetype.Latex,
  SupportedMimetype.Text,
  SupportedMimetype.RichText,
  SupportedMimetype.RtfText,
  SupportedMimetype.XmlText,
];

type MimetypeFilter = 'all' | 'images' | 'pdf' | 'documents';

const mimetypeFilterMap: Record<MimetypeFilter, SupportedMimetype[]> = {
  all: supportedMimetypes,
  images,
  pdf,
  documents,
};

export const createMulterOptions = (mimetypeFilter: MimetypeFilter = 'all'): MulterOptions => {
  return {
    limits: {
      // Kubernetes Ingress is set to 25m. So this should strike first to get the error through the api
      fileSize: 24_000_000,
    },
    fileFilter: (_req, file, cb) => {
      try {
        validateMimetype(file, mimetypeFilterMap[mimetypeFilter]);
      } catch (error) {
        return cb(error, false);
      }

      // https://github.com/expressjs/multer/pull/1102#issuecomment-1214736616
      if (!/[^\u0000-\u00ff]/.test(file.originalname)) {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
      }

      cb(null, true);
    },
  };
};
