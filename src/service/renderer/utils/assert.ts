export default (value: any, message = '') => {
  if (!value) {
    throw Object.assign(new Error(), {
      message,
    });
  }
  console.log(`  ✅ ${message} `);
}