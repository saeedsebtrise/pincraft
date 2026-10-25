import { pageMiddleware } from '../server/pageFetch.mjs';

/** GET /api/page?url=… — reads a blog post's title and photos (Blog URL → Pins). Public addresses only. */
const read = pageMiddleware();
export default (req, res) =>
  read(req, res, () => {
    res.statusCode = 404;
    res.end();
  });
