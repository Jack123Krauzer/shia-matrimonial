declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ADMIN_EMAIL?: string;
    RAZORPAY_KEY_ID?: string;
    RAZORPAY_KEY_SECRET?: string;
  }
}
