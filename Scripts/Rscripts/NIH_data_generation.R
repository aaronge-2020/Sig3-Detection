# First time installation

install.packages("BiocManager")
BiocManager::install("sigminer", dependencies = FALSE, force = TRUE)

s
# Load packages

library(sigminer)
library(NMF)

library(tidyverse)
theme_set(theme_bw(16))

# Load and format data
mut = read.csv("D:/NIH/Mutational-Spectrum/Data/Real_data/BRCA_wgs.csv")

row.names(mut) = mut[, 97]
mut = mut[, 0:96]


# Reformat the column names to their required format to do NNLS with the cosmic data set
reformat_columns = function(data){
  new_data = colnames(data)
  for (i in 1:length(new_data)){
    new_data[i] = toupper(new_data[i])
    new_data[i] = paste(substr(new_data[i], 1, 1), '[', substr(new_data[i], 3, 3), '>', substr(new_data[i], 5, 5), ']', substr(new_data[i], 7, 7),  sep='')
  }
  return(new_data)
}

colnames(mut) = reformat_columns(mut)

mut = t(mut)

# Running it once to  perform a signatures decomposition of a given mutational catalogue V with known
# signatures W by solving the minimization problem min(||W*H - V||) where W and V are known.


sig_fit = sig_fit(data.matrix(mut), sig_index ="ALL", sig_db="SBS_hg19", mode='SBS', type='relative')

write.csv(sig_fit, 'BCRA_exposures.csv')
# Transpose data and save it as a csv
sig_fit = t(sig_fit)
write.table(sig_fit, 'sig_fit.csv', sep=',')

# Finding a bootstrap distribution to obtain the confidence of signature exposures

# n = 1
# sig_fit_0 = sig_fit_bootstrap(data.matrix(mut[,n]), sig_index ="ALL", sig_db="SBS_hg19", mode='SBS', type='relative')
report_bootstrap_p_value(sig_fit)

# Performance Evaluation
sig_index = c(1, 2, 3, 5, 6, 8, 13, 17, 18, 20, 26, 30)

bt_result <- sig_fit_bootstrap_batch(mut, sig_db="legacy", n = 1000, sig_index ="ALL", p_val_thresholds = c(0, 0.01, 0.05, 0.10, 0.2))

show_sig_bootstrap_exposure(bt_result, signatures = list('SBS3'), dodge_width=0.25, xlab='Signatures', )

show_sig_bootstrap_error(bt_result)

report_bootstrap_p_value(bt_result)
saveRDS(bt_result, 'sigminer_results_wilcoxon_p_value_01.RDS')


results = readRDS("D:/NIH/sigminer-master/p_value_part_sig_full_threshold.RDS")
n <- results$p_val[seq(3, length(results$p_val$sample), 1)]

write.csv(n, 'all_sig_p_value_part_sig_full_threshold.csv')

