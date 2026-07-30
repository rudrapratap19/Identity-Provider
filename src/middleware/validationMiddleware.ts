import { Request, Response, NextFunction } from 'express';

export const validateAuthorizeParams = (req: Request, res: Response, next: NextFunction): void => {
  // Can be used for GET and POST depending on where it's mounted, we check both body and query
  const params = req.method === 'POST' ? req.body : req.query;
  const { client_id, redirect_uri, response_type, state } = params;

  if (!client_id || !redirect_uri || !state) {
    res.status(400).json({ error: 'invalid_request', error_description: 'Missing required parameters' });
    return;
  }

  // response_type is mandatory for GET /authorize, but might not be re-submitted in POST depending on the form
  if (req.method === 'GET' && response_type !== 'code') {
    res.status(400).json({ error: 'unsupported_response_type', error_description: 'Only code response type is supported' });
    return;
  }

  next();
};
