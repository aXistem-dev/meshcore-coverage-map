export async function onRequest(context) {
  const store = context.env.SAMPLES;

  const samplesList = await store.list();
  samplesList.keys.forEach(async s => {
    // console.log(JSON.stringify(s));
    const parts = s.name.split('|');
    if (parts.length === 2) {
      console.log(`${s.name} is new schema`);
    } else if (parts.length === 3) {
      console.log(`${s.name} is old schema`);
      const metadata = s.metadata;
      const key = `${metadata.lat}|${metadata.lon}`;
      await store.put(key, "", {
        metadata: metadata,
        expirationTtl: 15552000  // 180 days
      });
      await store.delete(s.name);
    } else {
      console.log(`${s.name} is bad`);
    }
  });

  return new Response('OK');
}
