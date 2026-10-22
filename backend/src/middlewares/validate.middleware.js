export const validate = schemas => (req, res, next) => {
  try {
    const parsed = {};
    for (const key of ['body', 'query', 'params']) if (schemas[key]) parsed[key] = schemas[key].parse(req[key]);
    req.validated = { ...req.validated, ...parsed };
    for (const [key, value] of Object.entries(parsed)) {
      // Express 5 expone query mediante un getter sin setter.
      if (key === 'query') Object.defineProperty(req, key, { value, writable: true, configurable: true });
      else req[key] = value;
    }
    next();
  } catch (error) { next(error); }
};
