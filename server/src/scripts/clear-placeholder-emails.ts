/**
 * Clears auto-generated placeholder emails from phone-only OTP donors.
 * Run: npm run clear-placeholder-emails --prefix server
 */
import { connectDatabase } from '../config/database.js';
import { User } from '../models/User.js';
import { isPlaceholderDonorEmail } from '../utils/donorEmail.js';
import { ensureSparseEmailIndex } from '../utils/userIndexes.js';

async function main() {
  await connectDatabase();
  await ensureSparseEmailIndex();

  const donors = await User.find({ role: 'donor' }).select('_id email email_verified').lean();
  let cleared = 0;

  for (const donor of donors) {
    if (!donor.email || !isPlaceholderDonorEmail(donor.email)) continue;
    await User.findByIdAndUpdate(donor._id, {
      $unset: { email: 1 },
      $set: { email_verified: false, email_verified_at: null },
    });
    cleared += 1;
    console.log(`Cleared placeholder email for donor ${donor._id}`);
  }

  console.log(`Done. Cleared ${cleared} placeholder email(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
