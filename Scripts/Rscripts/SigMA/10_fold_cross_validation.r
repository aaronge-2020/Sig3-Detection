devtools::load_all()
library(pROC)
createFolds <-  function(y, k = 10, list = TRUE, returnTrain = FALSE)
  {

    if(is.numeric(y))
    {
      ## Group the numeric data based on their magnitudes
      ## and sample within those groups.

      ## When the number of samples is low, we may have
      ## issues further slicing the numeric data into
      ## groups. The number of groups will depend on the
      ## ratio of the number of folds to the sample size.
      ## At most, we will use quantiles. If the sample
      ## is too small, we just do regular unstratified
      ## CV
      cuts <- floor(length(y)/k)
      if(cuts < 2) cuts <- 2
      if(cuts > 5) cuts <- 5
      y <- cut(
        y,
        unique(
          quantile(y,
                   probs =
                     seq(0, 1, length = cuts))),
        include.lowest = TRUE)
    }


    if(k < length(y))
    {
      ## reset levels so that the possible levels and
      ## the levels in the vector are the same
      y <- factor(as.character(y))
      numInClass <- table(y)
      foldVector <- vector(mode = "integer", length(y))

      ## For each class, balance the fold allocation as far
      ## as possible, then resample the remainder.
      ## The final assignment of folds is also randomized.
      for(i in 1:length(numInClass))
      {
        ## create a vector of integers from 1:k as many times as possible without
        ## going over the number of samples in the class. Note that if the number
        ## of samples in a class is less than k, nothing is producd here.
        seqVector <- rep(1:k, numInClass[i] %/% k)
        ## add enough random integers to get  length(seqVector) == numInClass[i]
        if(numInClass[i] %% k > 0) seqVector <- c(seqVector, sample(1:k, numInClass[i] %% k))
        ## shuffle the integers for fold assignment and assign to this classes's data
        foldVector[which(y == dimnames(numInClass)$y[i])] <- sample(seqVector)
      }
    } else foldVector <- seq(along = y)

    if(list)
    {
      out <- split(seq(along = y), foldVector)
      names(out) <- paste("Fold", gsub(" ", "0", format(seq(along = out))), sep = "")
      if(returnTrain) out <- lapply(out, function(data, y) y[-data], y = seq(along = y))
    } else out <- foldVector
    out
  }

require("reticulate")

# Code for getting the folds used in testing the machine learning  --------


source_python("read_pickle_file.py")
pickle_data <- read_pickle_file("D:/NIH/Mutational-Spectrum-master/Data/New/train_test_indices.npy")




# Obtaining WGS and Panel Data --------------------------------------------


# Load and format WGS data
mut_wgs = read.csv("D:/NIH/Mutational-Spectrum-master/Data/New/WGS/BRCA_merged_WGS.csv")

row.names(mut_wgs) = mut_wgs[, 97]
mut_wgs = mut_wgs[, 0:96]


# Reformat the column names to their required format to do NNLS with the cosmic data set
reformat_columns = function(data){
  new_data = colnames(data)
  for (i in 1:96){
    new_data[i] = toupper(new_data[i])
    new_data[i] = paste(substr(new_data[i], 1, 1), '[', substr(new_data[i], 3, 3), '>', substr(new_data[i], 5, 5), ']', substr(new_data[i], 7, 7),  sep='')
  }
  return(new_data)
}

colnames(mut_wgs) = reformat_columns(mut_wgs)


# Load and format panel data

mut_panel = read.csv("D:/NIH/Mutational-Spectrum-master/Data/New/MSK_Impact_train/BRCA_MSK_sigminer_wilcoxon_test_p_val_final.csv")

row.names(mut_panel) = mut_panel[, length(mut_panel)]

mut_panel = mut_panel[, 0:(length(mut_panel)-1)]
colnames(mut_panel) = reformat_columns(mut_panel)

# Get the subset of the WGS data that are in the panel data
mut_panel = mut_panel[ row.names(mut_panel) %in% row.names(mut_wgs), ]

mut_wgs = mut_wgs[rownames(mut_panel),]

# check if the rows match in the WGS and panel data
sum(row.names(mut_wgs) == row.names(mut_panel))



# Code for training the SigMA model ---------------------------------------


create_gbm_model <- function(wgs_train, gbm_model_name) {


  # I have to turn the dataframe into a table and then get the name of the table to run it through
  train_file_name = paste(gbm_model_name, '_wgs.CSV', sep='')
  write.table(wgs_train, train_file_name, row.names = F, sep = ',', quote = F)

  # Run simulation of WGS to test tune the GBM
  simul_file <- quick_simulation(train_file_name,
                                 tumor_type = 'breast',
                                 data = 'wgs',
                                 run_SigMA = T,
                                 remove_msi_pole = T)

  # Using the simulations tune a new Gradient Boosting Machine
  tune_new_gbm(simul_file,
               tumor_type = 'breast',
               data = 'wgs',
               run_SigMA = T,
               rda_file = paste(gbm_model_name,'.rda', sep=''))


  message('tuned')
  load(paste(gbm_model_name,'.rda', sep=''))

  simul_file_output <- gsub(simul_file, pattern = '.csv', replace = '_predictions.csv')
  df_predict <- read.csv(simul_file_output)

  # Get thresholds for given false positive rate
  limits_fpr <- c(0.1, 0.05)
  cut_var <- 'fpr' # you can alternatively use 'sen' to select on specific sensitivity value


  thresh <- get_threshold(df_predict, limits_fpr, var = 'prob', cut_var = cut_var, signal = 'is_sig3') # FPR < 0.1
  cutoff <- thresh$cutoff[[1]]
  cutoff_strict <- thresh$cutoff[[2]]


  # then we add the new gbm model in the system files together with the
  # cutoffs we determined so that these can be used in the future for
  # new data sequenced with the same sequencing platform
  try(add_gbm_model(gbm_model_name,
                tumor_type = 'breast',
                gbm_model = gbm_model,
                cutoff  = cutoff,
                cutoff_strict = cutoff_strict))

}


testSigMA = function(test_panel, gbm_model_name, norm96){

  test_file_name = paste(gbm_model_name, '_panel.CSV', sep='')


  write.table((test_panel), test_file_name, row.names = F, sep = ',', quote = F)

  tuned_gbm_model_output <- run(test_file_name,
                         data=gbm_model_name,
                         tumor_type = 'breast',
                         do_mva = T,
                         do_assign = T,
                         check_msi = T,
                         custom = T,
                         norm96 = norm96,
                         return_df = T) # replace_with norm96 using the bed file that defines the library coverage

  result = tryCatch({
    roc_0 <- roc(test_panel$is_sig3, tuned_gbm_model_output$Signature_3_mva)
  }, error = function(e) {
    roc_0 = 0
  }, finally = {
    auc_0 = auc(roc_0)
  })




  roc_1 <- try(roc(test_panel$is_sig3_01, tuned_gbm_model_output$Signature_3_mva))
  auc_1 = auc(roc_1)

  roc_5 <- roc(test_panel$is_sig3_05, tuned_gbm_model_output$Signature_3_mva)
  auc_5 = auc(roc_5)

  roc_10 <- roc(test_panel$is_sig3_10, tuned_gbm_model_output$Signature_3_mva)
  auc_10 = auc(roc_10)

  roc_20 <- roc(test_panel$is_sig3_20, tuned_gbm_model_output$Signature_3_mva)
  auc_20 = auc(roc_20)

  all_aucs = c(auc_0,auc_1, auc_5, auc_10, auc_20)
  return (all_aucs)
  # Code to get the ROC_AUC by passing in SigMA's predictions and comparing them to the labels given in the panel dataset.
  # Not written yet, because I don't have bed files.

}





# Actual K-Fold Cross Validation ------------------------------------------

# Load the bed file:
# bed_file = file.path("D:/NIH/SigMA-master/SigMA-master/inst/extdata/examples/seqcap_capture.bed")
bed_file <- file.path("D:/NIH/Mutational-Spectrum-master/Data/New/Panel/MSK-Impact/MSK-IMPACT410_mod.bed")

# Getting the trinucleotide norm
norm96 <- get_trinuc_norm(bed_file)
saveRDS(norm96, file = "MSK_Impact_norm96.rds")

# Loading the trinucleotide norm

norm96 <- readRDS('MSK_Impact_norm96.rds')


# Iterate through each fold created by the createFolds function, get the AUC of each fold, and append it to the AUCS list.
fold_auc_00 = c()
fold_auc_01 = c()
fold_auc_05 = c()
fold_auc_10 = c()
fold_auc_20 = c()

for (i in 1:10){

  gbm_model_name = paste('fold_', toString(i), sep='')
  print(gbm_model_name)

#
  test_indices = unlist(pickle_data[i,2])
  train_indices = unlist(pickle_data[i,1])

  wgs_train = mut_wgs[train_indices,]
  test_panel = mut_panel[test_indices,][,1:101]


  # create_gbm_model(train_wgs, gbm_model_name)
  #
  AUCs = testSigMA (test_panel, gbm_model_name, norm96)
  fold_auc_00 = c(fold_auc_00, AUCs[1])
  fold_auc_01 = c(fold_auc_01, AUCs[2])
  fold_auc_05 = c(fold_auc_05, AUCs[3])
  fold_auc_10 = c(fold_auc_10, AUCs[4])
  fold_auc_20 = c(fold_auc_20, AUCs[5])

}

results <- data.frame (is_sig3  = fold_auc_00,
                  is_sig3_01 =  fold_auc_01,
                  is_sig3_05 =  fold_auc_05,
                  is_sig3_10 =  fold_auc_10,
                  is_sig3_20 =  fold_auc_20

)

apply(results,2,median)

apply(results,2,mad)

save(results,file="MSK_impact_roc_aucs.Rda")


# Code for Debugging Purposes --------------------------------------
# I have to turn the dataframe into a table and then get the name of the table to run it through
train_file_name = paste(gbm_model_name, '_wgs.CSV', sep='')

write.table(wgs_train, train_file_name, row.names = F, sep = ',', quote = F)

# Run simulation of WGS to test tune the GBM
simul_file <- quick_simulation(train_file_name,
                               tumor_type = 'breast',
                               data = 'wgs',
                               run_SigMA = T,
                               remove_msi_pole = T)

# Using the simulations tune a new Gradient Boosting Machine
tune_new_gbm(simul_file,
             tumor_type = 'breast',
             data = 'wgs',
             run_SigMA = T,
             rda_file = paste(gbm_model_name,'.rda', sep=''))


message('tuned')
load(paste(gbm_model_name,'.rda', sep=''))

simul_file_output <- gsub(simul_file, pattern = '.csv', replace = '_predictions.csv')
df_predict <- read.csv(simul_file_output)

# Get thresholds for given false positive rate
limits_fpr <- c(0.1, 0.05)
cut_var <- 'fpr' # you can alternatively use 'sen' to select on specific sensitivity value


thresh <- get_threshold(df_predict, limits_fpr, var = 'prob', cut_var = cut_var, signal = 'is_sig3') # FPR < 0.1
cutoff <- thresh$cutoff[[1]]
cutoff_strict <- thresh$cutoff[[2]]


# then we add the new gbm model in the system files together with the
# cutoffs we determined so that these can be used in the future for
# new data sequenced with the same sequencing platform
add_gbm_model(gbm_model_name,
              tumor_type = "breast",
              gbm_model = gbm_model,
              cutoff  = cutoff,
              cutoff_strict = cutoff_strict)


test_file_name = paste(gbm_model_name, '_panel.CSV', sep='')


write.table((test_panel), test_file_name, row.names = F, sep = ',', quote = F)

tuned_gbm_model_output <- run(test_file_name,
                              data=gbm_model_name,
                              tumor_type = 'breast',
                              do_mva = T,
                              do_assign = T,
                              check_msi = T,
                              custom = T,
                              norm96 = norm96,
                              return_df = T) # replace_with norm96 using the bed file that defines the library coverage





