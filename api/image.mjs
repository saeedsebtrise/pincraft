import { pageMiddleware } from '../server/pageFetch.mjs';

/** GET /api/image?url=… — fetches one of the post's photos so the browser can use it. Public addresses only. */
const read = pageMiddleware();
export default (req, res) =>
  read(req, res, () => {
    res.statusCode = 404;
    res.end();
  });
