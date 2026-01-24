pragma circom 2.0.0;

// Hash library
include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "../../../node_modules/circomlib/circuits/comparators.circom"; 

template AgeVerification() {
    // Inputs (private - not revealed)
    signal input aadharNumber; // User's 12-digit Aadhaar (private)
    signal input dateOfBirth; // Unix timestamp (private)
    signal input salt;        // Random salt for privacy (private)
    signal input currentTimestamp; // Passed as public input normally or private if we want to hide when proof was made (usually public)
    
    // Outputs (public - revealed)
    signal output aadharHash;      // Index 0
    signal output publicAgeGroup;  // Index 1 (Matches contract input[1])
    signal output isAdult;         // Index 2
    signal output ageGroupCommit;  // Index 3
    
    // Constants
    // 18 years in seconds = 18 * 365.25 * 24 * 60 * 60 = 568036800 (approx)
    // Using user provided constant: 568024800
    var EIGHTEEN_YEARS_SECONDS = 568024800; 
    var TWENTY_ONE_YEARS_SECONDS = 662131200;
    var TWENTY_FIVE_YEARS_SECONDS = 788923200;
    
    // 1. Hash the Aadhaar number (with salt) - creates public commitment without revealing Aadhaar
    component poseidonAadhaar = Poseidon(2);
    poseidonAadhaar.inputs[0] <== aadharNumber;
    poseidonAadhaar.inputs[1] <== salt;
    aadharHash <== poseidonAadhaar.out;
    
    // 2. Calculate current age
    // We assume currentTimestamp > dateOfBirth
    signal ageInSeconds;
    ageInSeconds <== currentTimestamp - dateOfBirth;
    
    // 3. Check if adult (18+)
    component isGeq18 = GreaterEqThan(64); // timestamp fits in 64 bits
    isGeq18.in[0] <== ageInSeconds;
    isGeq18.in[1] <== EIGHTEEN_YEARS_SECONDS;
    isAdult <== isGeq18.out;
    
    // 4. Determine age group (more granular)
    component isGeq21 = GreaterEqThan(64);
    isGeq21.in[0] <== ageInSeconds;
    isGeq21.in[1] <== TWENTY_ONE_YEARS_SECONDS;
    
    component isGeq25 = GreaterEqThan(64);
    isGeq25.in[0] <== ageInSeconds;
    isGeq25.in[1] <== TWENTY_FIVE_YEARS_SECONDS;
    
    // ageGroup: 0 = under 18, 1 = 18-20, 2 = 21-24, 3 = 25+
    // Note: isGeq18 will be 1 if isGeq21 is 1. 
    // Logic: 
    // < 18: 0 + 0 + 0 = 0
    // >= 18: 1 + 0 + 0 = 1
    // >= 21: 1 + 1 + 0 = 2
    // >= 25: 1 + 1 + 1 = 3
    
    signal ageGroup;
    ageGroup <== isGeq18.out + isGeq21.out + isGeq25.out;
    
    // Hash the age group to prevent revealing exact age group directly (though here it's predictable, 
    // but useful if we wanted to salt it too. The request implies hashing it)
    component poseidonAgeGroup = Poseidon(1);
    poseidonAgeGroup.inputs[0] <== ageGroup;
    ageGroupCommit <== poseidonAgeGroup.out;
    
    // Ensure proof is only generated/valid if 18+? 
    // The user requirement says: "Verify age via zero-knowledge proof... Input[1] = age group".
    // And Solidity checks: "require(provedAgeGroup >= uint256(requiredAgeGroup))".
    // So the circuit just outputs the age group (hashed or raw).
    // The user code snippet calls verifying contract with "provedAgeGroup = input[1]".
    // Wait, the Solidity verifier takes public inputs. 
    // If we output aadharHash, isAdult, ageGroupCommit - these are public inputs.
    // The solidity code: "uint256 provedAgeGroup = input[1];" assumes input map.
    // Standard groth16 verifier inputs are array.
    // Order matters. 
    // If our outputs are: aadharHash, isAdult, ageGroupCommit
    // input[0] = aadharHash
    // input[1] = isAdult
    // input[2] = ageGroupCommit
    
    // But user solidity says: 
    // Input[0] = hash of (Aadhaar number)
    // Input[1] = age group (0=18+, 1=21+, 2=25+)  <-- wait, user's verifyAge function uses input[1] as ageGroup.
    // But here I am hashing the ageGroup into ageGroupCommit.
    // If I pass the raw ageGroup as output, it's public.
    // If the purpose is "without revealing actual age", revealing "Adult" vs "Not Adult" is fine.
    // Revealing "Age Group 21+" is also fine if required.
    // The user circuit example: "signal ageGroup" as intermediate, and "ageGroupCommit" as output.
    // But the Solidity code seems to expect the age group value directly to compare >= required.
    // "uint256 provedAgeGroup = input[1];"
    // "require(provedAgeGroup >= ...)"
    // If I pass the hash, I can't compare >=.
    // So the solidity code implies the age group should be PUBLIC output (unhashed) OR the verifier checks against a hash.
    // But `provedAgeGroup >=` implies integer comparison.
    // So I will output `ageGroup` as signal output directly for simplicity and to match logic, 
    // OR change solidity to check hashes (which is harder for > constraints).
    // Given privacy goal is "not revealing exact age", revealing "21+" bucket is acceptable for the verifier logic.
    // BUT the user provided circuit hash it: "ageGroupCommit <== poseidonAgeGroup.out;".
    // AND the user solidity says: "Input[1] = age group".
    // There is a mismatch in user's prompt between circuit and solidity.
    // Circuit outputs `ageGroupCommit` (hashed).
    // Solidity reads `input[1]` as `provedAgeGroup` and compares.
    // I will modify the circuit to output `ageGroup` directly as a public output so Solidity works.
    
    
    publicAgeGroup <== ageGroup;
    
    // Also include aadharHash
}

component main {public [currentTimestamp]} = AgeVerification();
