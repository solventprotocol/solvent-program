#[cfg(test)]
mod tests {
    use ::solvent::common::*;
    use assert_panic::assert_panic;
    use test_case::test_case;

    #[test_case(CalculateLoanArgs{
        max_locker_duration: 100,
        num_nfts_in_bucket: 10,
        num_nfts_in_lockers: 5,
        interest_scaler: 100,
        locker_duration: 10,
    }, Some(CalculateLoanResult {
        principal_amount: 9666666666,
        max_interest_payable: 333333334
    }) ; "success case 1")]
    #[test_case(CalculateLoanArgs{
        max_locker_duration: 100,
        num_nfts_in_bucket: 10,
        num_nfts_in_lockers: 5,
        interest_scaler: 100,
        locker_duration: 10_000_000_000_000_000_000,
    }, None ; "overflow case 1")]
    #[test_case(CalculateLoanArgs{
        max_locker_duration: 10_000_000_000_000_000_000,
        num_nfts_in_bucket: 10,
        num_nfts_in_lockers: 5,
        interest_scaler: 100,
        locker_duration: 10,
    }, None ; "overflow case 2")]
    fn test_calculate_loan(args: CalculateLoanArgs, expected_result: Option<CalculateLoanResult>) {
        match expected_result {
            Some(expected_result) => {
                assert_eq!(calculate_loan(args), expected_result);
            }
            None => {
                assert_panic!({
                    calculate_loan(args);
                });
            }
        }
    }
}
