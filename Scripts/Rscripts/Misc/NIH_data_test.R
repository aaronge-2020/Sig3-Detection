results = readRDS("sigminer_results_wilcoxon_p_value_01.RDS")
signature_3_rmse = show_sig_bootstrap_stability(results, signatures = "COSMIC_3", measure = "MAE")
median(signature_3_rmse$data$measure)

show_sig_bootstrap_stability(results, signatures = "COSMIC_3", measure = "MAE")



signature_3_expo = show_sig_bootstrap_exposure(results, signatures = "COSMIC_3")

median(signature_3_expo$data$exposure)

show_sig_bootstrap_exposure(results, signatures = "COSMIC_3")

