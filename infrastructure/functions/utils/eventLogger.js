const logger = console;

const eventLogger = (handler) => (event, context) => {
  logger.info("Event =>", JSON.stringify(event, null, 2));
  return handler(event, context);
};

export default eventLogger;
