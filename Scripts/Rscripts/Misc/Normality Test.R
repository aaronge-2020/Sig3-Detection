
partial_sig_results = readRDS('p_value_part_sig_full_threshold.RDS')

show_sig_bootstrap_stability(partial_sig_results, signatures ="COSMIC_3")


show_sig_bootstrap_error(partial_sig_results)

show_sig_bootstrap_exposure(partial_sig_results, signatures="SBS3", sample="DO217787")

median(partial_sig_results$error$errors)


# TEST FOR NORMALITY USING Shapiro-Wilk test

dat <- partial_sig_results$expo

dat <- dplyr::filter(dat, .data$sig %in% "COSMIC_3")


normal = 0
for (name in unique(dat$sample)){
  samp <- dplyr::filter(dat, .data$sample %in% name)
  normality = 0

  tryCatch( { normality = as.integer(shapiro.test(samp$exposure)['p.value'] > 0.05)
if (shapiro.test(samp$exposure)['p.value'] > 0.5){
print(name)

}

  }
            , error = function(e) {

              normality = 0
              })

  normal = normal + normality

}
samp <- dplyr::filter(dat, .data$sample %in% "DO225159")
shapiro.test(samp$exposure)
hist(samp$exposure)
