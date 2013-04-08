#!/bin/bash

rm -rf h5back_min.vm
touch h5back_min.vm
while read line 
do
    
    if [[ $line =~ "yuicompressor" ]]; then
      script=`$line`;
      echo $script >>  h5back_min.vm
    else    
        echo $line >> h5back_min.vm
    fi
done < h5back.vm




